/**
 * One run, start to finish: capture the fleet, find the optimizer, predict
 * routes, wait for the map's enemy data, simulate the routes that reach the
 * target, dispatching each step to the panel. Mid-sortie, the predicted routes
 * are narrowed to the sortie's path so far and simulated from the node the
 * fleet is at, with the special attacks already fired. The target applies
 * after narrowing: a node target cuts the routes there and reads the rates at
 * that node; one without a battle fails before any simulation. Once the map's enemy data is in, each
 * battle node gets its formation and night battle: the user's for the node, else the default (see routes/formation). Each
 * step also goes to the developer log when it is on.
 *
 * The optimizer is resolved before compass is loaded, so a missing or corrupt
 * binary fails before any network use. The map's shared kcnav fetch starts
 * right after, overlapping prediction; a cancel stops only this run's wait for
 * it. Every failure ends in `failed` and a cancel in `cancelled`, so the panel
 * never stays in a running state.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { devLog } from '../devlog'
import { SimError } from '../errors'
import { specialsFired } from '../fleet/specials'
import { snapshotFleet } from '../fleet/snapshot'
import { toDeckbuilder } from '../fleet/toDeckbuilder'
import type { PoiState } from '../fleet/types'
import { simulateToml } from '../optimizer/config'
import { simulateRoutes } from '../optimizer/orchestrate'
import { ensureMapFetched, isNormalMap, prefetchMaps, untilAborted } from '../optimizer/prefetch'
import { resolveOptimizer, type OptimizerManifest, type ResolvedOptimizer } from '../optimizer/resolve'
import { atNodeTarget, Cancelled, checkRoute, kcnavDir, runSimulate } from '../optimizer/run'
import { findPackageRoot, workDir } from '../paths'
import { applyTarget, bossLettersFor, loadBossLetters } from '../routes/boss'
import { runCompass } from '../routes/compass'
import { mapFormations, nodeNightBattle, type Formation } from '../routes/formation'
import { createPredictor, type PredictedRoute } from '../routes/predict'
import { cellLetters, narrowToPath, takenBranches } from '../routes/sortie'
import { battleNodes, nodeColors, readTopology } from '../routes/topology'
import { loadOptimizerOverride } from './inputs'
import { sortRoutes, targetRouteIndexes, type RouteRow, type RunAction, type RunInput } from './state'

/** One predictor for the poi session, so its cache lives as long as poi; the panel reads its node options. */
export const predictor = createPredictor(runCompass)

/** The optimizer pinned in `optimizer.json`, or the development override; for runs and map fetches alike. */
export async function resolveBundledOptimizer(): Promise<ResolvedOptimizer> {
  const packageRoot = findPackageRoot()
  const manifest = JSON.parse(await readFile(join(packageRoot, 'optimizer.json'), 'utf8')) as OptimizerManifest
  return resolveOptimizer({
    packageRoot,
    manifest,
    override: loadOptimizerOverride(),
    platform: process.platform,
    arch: process.arch,
  })
}

/**
 * Start a queue of normal-map fetches: every normal map in the bundled data,
 * or `maps` for a retry. Resolves once the queue has started, without waiting
 * for it; rejects only when the optimizer, its data or the app data path can't
 * be found. The queue does nothing if another one is running.
 */
export async function fetchNormalMaps(opts: { force?: boolean; maps?: string[] } = {}): Promise<void> {
  const optimizer = await resolveBundledOptimizer()
  const maps = opts.maps ?? Object.keys(await loadBossLetters(optimizer.dataDir)).filter(isNormalMap)
  void prefetchMaps(maps, {
    binPath: optimizer.binPath,
    dataDir: optimizer.dataDir,
    workDir: workDir(),
    force: opts.force,
  })
}

export async function runSimulation(
  input: RunInput,
  state: PoiState | undefined,
  dispatch: (action: RunAction) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const snapshot = snapshotFleet(state, input.fleetId)
    const specials = input.sortie ? specialsFired() : undefined
    dispatch({ type: 'start', input, snapshot })
    devLog('run.start', { input, snapshot })

    const optimizer = await resolveBundledOptimizer()
    const bossLetters = bossLettersFor(await loadBossLetters(optimizer.dataDir), input.map)
    const cwd = workDir()
    if (input.target !== undefined) {
      // The panel offers only battle nodes, and only once the topology is there; this catches a stale pick.
      const battles = await readTopology(kcnavDir(cwd), input.map).then(battleNodes, () => undefined)
      if (battles && !battles.has(input.target)) {
        throw new SimError('TARGET_NOT_BATTLE', `Node ${input.target} on ${input.map} has no battle.`, [
          `battle nodes: ${[...battles].sort().join(', ')}`,
        ])
      }
    }
    if (signal.aborted) throw new Cancelled()

    // Not awaited here: the fetch overlaps prediction and outlives a cancel.
    let enemyDataReady = false
    const enemyData = ensureMapFetched(input.map, {
      binPath: optimizer.binPath,
      dataDir: optimizer.dataDir,
      workDir: cwd,
    }).finally(() => {
      enemyDataReady = true
    })

    // Mid-sortie, the visited letters come first: a branch the fleet has passed is predicted as taken.
    let letters: string[] | undefined
    if (input.sortie) {
      const sortie = { map: input.map, cells: input.sortie.cells }
      // The topology is written first by the map's kcnav fetch; wait for it only when it isn't there yet.
      letters = await cellLetters(kcnavDir(cwd), sortie).catch(async () => {
        await untilAborted(enemyData, signal)
        return cellLetters(kcnavDir(cwd), sortie)
      })
      if (signal.aborted) throw new Cancelled()
    }
    const choices = letters ? { ...input.choices, ...takenBranches(input.map, letters) } : input.choices

    const candidates = await predictor.predict({
      deck: toDeckbuilder(snapshot),
      map: input.map,
      choices,
      bossLetters,
    })
    if (signal.aborted) throw new Cancelled()
    const routeText = (routes: (PredictedRoute & { reachesTarget?: boolean })[]) =>
      routes.map((c) => ({
        nodes: c.nodes.join('-'),
        probability: c.probability,
        endsAtBoss: c.endsAtBoss,
        reachesTarget: c.reachesTarget,
      }))
    devLog('run.predicted', { map: input.map, choices, routes: routeText(candidates) })
    let narrowed: (PredictedRoute & { from?: number })[] = candidates
    if (input.sortie && letters) {
      narrowed = narrowToPath(candidates, letters, input.map).map((c) => ({ ...c, from: letters!.length - 1 }))
      devLog('run.narrowed', {
        map: input.map,
        cells: input.sortie.cells,
        letters,
        kept: routeText(narrowed),
        record: specials,
        specialAttacksFired: specials?.observed ? specials.fired : [],
      })
    }
    if (signal.aborted) throw new Cancelled()
    const targeted = applyTarget(narrowed, input.target, bossLetters)
    if (input.target !== undefined) devLog('run.targeted', { target: input.target, routes: routeText(targeted) })
    const rows: RouteRow[] = sortRoutes(targeted)
    const indexes = targetRouteIndexes(rows)
    const fetchingEnemyData = indexes.length > 0 && !enemyDataReady
    dispatch({
      type: 'predicted',
      routes: rows,
      devOptimizer: optimizer.dev,
      fetchingEnemyData,
      sortieUnobserved: specials && !specials.observed,
    })
    if (fetchingEnemyData) {
      // A failed fetch is not an error: each simulate fetches what its route still lacks.
      await untilAborted(enemyData, signal)
      dispatch({ type: 'enemyDataReady' })
    }
    // Read after the enemy data, for the submarine rules. Without a topology no node is known to have a battle,
    // so none gets a formation and the optimizer uses its own default.
    const topology = await readTopology(kcnavDir(cwd), input.map).catch(() => undefined)
    if (signal.aborted) throw new Cancelled()
    const formations = topology
      ? mapFormations({
          kcnavDir: kcnavDir(cwd),
          map: input.map,
          topology,
          $ships: state?.const?.$ships,
          user: input.formations,
        })
      : {}
    // A route's last node is its target. Without a topology, as on a map's first run, only that node is known.
    const battles = topology && battleNodes(topology)
    const colors = topology ? nodeColors(topology) : new Map<string, number>()
    const nightBattlesFor = (nodes: string[]): Record<string, boolean> => {
      const target = nodes[nodes.length - 1]!
      if (!battles) return { [target]: true }
      const out: Record<string, boolean> = {}
      for (const node of new Set(nodes)) {
        if (!battles.has(node)) continue
        const v = nodeNightBattle({ setting: input.nightBattles[node], isTarget: node === target, color: colors.get(node) })
        if (v !== undefined) out[node] = v
      }
      return out
    }
    const targets = indexes.map((i) => rows[i]!).map((row) => row.nodes.slice(row.from ?? 1))
    if (targets.length > 0) {
      // For the footer: whether any simulated route pursues night battle at its target.
      dispatch({
        type: 'nightBattleResolved',
        atTarget: targets.some((nodes) => nightBattlesFor(nodes)[nodes[nodes.length - 1]!] === true),
      })
    }

    await simulateRoutes({
      routes: indexes,
      signal,
      run: async (rowIndex, _i, routeSignal) => {
        const row = rows[rowIndex]!
        const nodes = row.nodes.slice(row.from ?? 1)
        const routeFormations: Record<string, Formation> = Object.fromEntries(
          nodes.filter((node) => node in formations).map((node) => [node, formations[node]!.formation]),
        )
        const routeNightBattles = nightBattlesFor(nodes)
        const toml = simulateToml({
          snapshot,
          map: input.map,
          nodes,
          trials: input.trials,
          nightBattles: routeNightBattles,
          perNode: input.target !== undefined,
          specialAttacksFired: specials?.observed ? specials.fired : undefined,
          formations: routeFormations,
        })
        devLog('route.config', {
          nightBattles: routeNightBattles,
          row: rowIndex,
          nodes: nodes.join('-'),
          // Where each formation comes from: the user, or the default's reason.
          formations: Object.fromEntries(
            Object.keys(routeFormations).map((node) => {
              const f = formations[node]!
              return [node, `${f.formation} (${f.isDefault ? f.reason : 'user'})`]
            }),
          ),
          toml,
        })
        try {
          const checked = checkRoute(
            await runSimulate({
              binPath: optimizer.binPath,
              dataDir: optimizer.dataDir,
              workDir: cwd,
              logName: `route-${rowIndex}.log`,
              toml,
              signal: routeSignal,
            }),
            nodes,
          )
          const diag = input.target !== undefined ? atNodeTarget(checked) : checked
          const m = diag.ranks_marginal
          devLog('route.done', {
            row: rowIndex,
            nodes: nodes.join('-'),
            reachTarget: diag.reach_boss_rate,
            perNodeReach: diag.per_node_reach,
            s: m.S,
            aOrBetter: m.S + m.A,
            bOrBetter: m.S + m.A + m.B,
            targetSunk: diag.boss_sunk_rate,
          })
          return diag
        } catch (err) {
          if (!routeSignal.aborted) devLog('route.failed', { row: rowIndex, nodes: nodes.join('-'), error: errorFields(err) })
          throw err
        }
      },
      onRouteDone: (i, diag) => dispatch({ type: 'routeDone', index: indexes[i]!, diag }),
    })
    dispatch({ type: 'finished' })
    devLog('run.finished', { map: input.map })
  } catch (err) {
    devLog(err instanceof Cancelled || signal.aborted ? 'run.cancelled' : 'run.failed', {
      map: input.map,
      error: errorFields(err),
    })
    if (err instanceof Cancelled || signal.aborted) {
      dispatch({ type: 'cancelled' })
    } else if (err instanceof SimError) {
      dispatch({ type: 'failed', error: err, input })
    } else {
      dispatch({
        type: 'failed',
        error: new SimError('INTERNAL', 'Something unexpected went wrong.', [String((err as Error)?.stack ?? err)]),
        input,
      })
    }
  }
}

/** An error as plain fields for the developer log. */
const errorFields = (err: unknown) =>
  err instanceof SimError
    ? { code: err.code, message: err.message, details: err.details }
    : { message: String((err as Error)?.stack ?? err) }
