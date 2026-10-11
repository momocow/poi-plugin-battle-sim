/**
 * One run, start to finish: capture the fleet, find the optimizer, predict
 * routes, wait for the map's enemy data, simulate the boss routes, dispatching
 * each step to the panel. Each step also goes to the developer log when it is
 * on.
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
import { snapshotFleet } from '../fleet/snapshot'
import { toDeckbuilder } from '../fleet/toDeckbuilder'
import type { PoiState } from '../fleet/types'
import { simulateToml } from '../optimizer/config'
import { simulateRoutes } from '../optimizer/orchestrate'
import { ensureMapFetched, untilAborted } from '../optimizer/prefetch'
import { resolveOptimizer, type OptimizerManifest } from '../optimizer/resolve'
import { Cancelled, checkRoute, runSimulate } from '../optimizer/run'
import { findPackageRoot, workDir } from '../paths'
import { bossLettersFor, loadBossLetters } from '../routes/boss'
import { runCompass } from '../routes/compass'
import { createPredictor, type RouteCandidate } from '../routes/predict'
import { loadOptimizerOverride } from './inputs'
import { bossRouteIndexes, sortRoutes, type RouteRow, type RunAction, type RunInput } from './state'

/** One predictor for the poi session, so its cache lives as long as poi. */
const predictor = createPredictor(runCompass)

export async function runSimulation(
  input: RunInput,
  state: PoiState | undefined,
  dispatch: (action: RunAction) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    const snapshot = snapshotFleet(state, input.fleetId)
    dispatch({ type: 'start', input, snapshot })
    devLog('run.start', { input, snapshot })

    const packageRoot = findPackageRoot()
    const manifest = JSON.parse(await readFile(join(packageRoot, 'optimizer.json'), 'utf8')) as OptimizerManifest
    const optimizer = await resolveOptimizer({
      packageRoot,
      manifest,
      override: loadOptimizerOverride(),
      platform: process.platform,
      arch: process.arch,
    })
    const bossLetters = bossLettersFor(await loadBossLetters(optimizer.dataDir), input.map)
    const cwd = workDir()
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

    const candidates = await predictor.predict({
      deck: toDeckbuilder(snapshot),
      map: input.map,
      choices: input.choices,
      bossLetters,
    })
    if (signal.aborted) throw new Cancelled()
    const routeText = (routes: RouteCandidate[]) =>
      routes.map((c) => ({ nodes: c.nodes.join('-'), probability: c.probability, reachesBoss: c.reachesBoss }))
    devLog('run.predicted', { map: input.map, choices: input.choices, routes: routeText(candidates) })
    const rows: RouteRow[] = sortRoutes(candidates)
    const indexes = bossRouteIndexes(rows)
    const fetchingEnemyData = indexes.length > 0 && !enemyDataReady
    dispatch({ type: 'predicted', routes: rows, devOptimizer: optimizer.dev, fetchingEnemyData })
    if (fetchingEnemyData) {
      // A failed fetch is not an error: each simulate fetches what its route still lacks.
      await untilAborted(enemyData, signal)
      dispatch({ type: 'enemyDataReady' })
    }

    await simulateRoutes({
      routes: indexes,
      signal,
      run: async (rowIndex, _i, routeSignal) => {
        const nodes = rows[rowIndex]!.nodes.slice(1)
        const toml = simulateToml({ snapshot, map: input.map, nodes, trials: input.trials })
        devLog('route.config', { row: rowIndex, nodes: nodes.join('-'), toml })
        try {
          const diag = checkRoute(
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
          const m = diag.ranks_marginal
          devLog('route.done', {
            row: rowIndex,
            nodes: nodes.join('-'),
            reachBoss: diag.reach_boss_rate,
            perNodeReach: diag.per_node_reach,
            s: m.S,
            aOrBetter: m.S + m.A,
            bOrBetter: m.S + m.A + m.B,
            bossSunk: diag.boss_sunk_rate,
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
