/**
 * The plugin panel, filling poi's plugin area without an outer scrollbar:
 * controls bar, fleet (collapsible) and summary, all fixed; below them the
 * error and the route cards, the only part that scrolls; and a footer fixed at
 * the bottom, naming what the result was run with and, on the right, the run
 * status. The result is dimmed once the settings no longer match it.
 *
 * Before a run the fleet display follows the live store; from the start of a
 * run it shows the run's snapshot. The fleet for a run is read from the store
 * at the moment Simulate is clicked.
 *
 * A run also starts by itself when the selected fleet, its ships, their HP or
 * equipment, the map, the route choices, the target, night battle or the
 * trial count (set on poi's settings page, and followed live) change, once every
 * ship has all its main slots filled and the inputs have settled for the delay
 * set on poi's settings page, unless the automatic-run switch is off. It also starts,
 * after the same delay, when poi brings the plugin into view while the panel
 * has no run, and at once when the switch is turned back on over a dimmed
 * result.
 *
 * While the selected fleet is on a sortie (sortie mode, with its tag and the
 * fleet and map locked on the sortie's), runs use the sortie's map and that
 * map's choices instead of the selected ones, narrowed to the path so far; the
 * fleet advancing a node starts a run, and coming home returns to the selected
 * map.
 *
 * The target belongs to the planned sortie, not to a map: picking another map
 * sets it back to Boss. A sortie on the selected map uses and changes it; one
 * on another map gets its own, Boss at first, kept only while that sortie
 * lasts. Until the shown map's kcnav topology is cached (its first run fetches
 * it) the target row is hidden and runs use Boss, as before targets; the
 * topology also tells which predicted nodes have a battle, the only ones offered.
 *
 * Each battle node of the shown map has a formation and a night battle
 * setting: the user's, set in the Node settings popup and remembered per map,
 * else the default (night battle only at the target). Closing the popup after
 * a change saves it and starts a run at once, as Simulate does, whatever the
 * automatic-run switch says; no automatic run follows for it.
 *
 * On an event map, the run simulates one event state — difficulty, gauge and
 * gauge state — read from the game, with the user's per-map overrides on top
 * (none mid-sortie); it changes with the game, and a change starts a run as
 * any input does. The map and enemy data come from the game-data package in
 * use, or the plugin's own fetches for what it doesn't cover; a newer package
 * version is offered by the footer's update prompt, which opens by itself only
 * while the plugin is in view and no popup of the panel is open.
 *
 * Reset clears the fleet and map: it stops any run, drops a pending automatic
 * run and clears the result (node settings stay), and until both are picked again nothing runs,
 * by hand or by itself. A selected fleet that sorties still runs in sortie
 * mode, which never uses the selected map.
 */
import { Tag } from '@blueprintjs/core'
import React, { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { useSelector } from 'react-redux'

import { devLog } from '../devlog'
import { SimError } from '../errors'
import { buildFleetViewModel, type FleetViewModel } from '../fleet-view/model'
import { FleetView } from '../fleet-view/FleetView'
import { fleetLoadout, snapshotFleet } from '../fleet/snapshot'
import type { PoiState } from '../fleet/types'
import { kcnavDirFor } from '../gameData/kcnav'
import { gameData, onGameData } from '../gameData/store'
import { t } from '../i18n'
import { workDir } from '../paths'
import { getStoreState } from '../poi'
import { eventStateFor, gaugesOf, isEventMap, kcnavVariant, mapIdOf, thresholdOf, type EventOverride } from '../routes/eventState'
import { mapFormations, type NightBattle } from '../routes/formation'
import { cellLettersNow, sortieOf, takenBranches, type Sortie } from '../routes/sortie'
import {
  AIR_RAID_COLOR,
  battleNodes,
  BOSS_COLOR,
  NIGHT_BATTLE_COLOR,
  nodeColors,
  topologyNow,
  type RouteTable,
} from '../routes/topology'
import { Controls } from './Controls'
import { DataUpdate } from './DataUpdate'
import { errorSummary, ErrorView } from './ErrorView'
import { NodeSettingsButton, type NodeSettings } from './NodeSettings'
import { setShownFleet } from './focus'
import {
  choicesForMap,
  clampTrials,
  groupMapsByArea,
  isPluginShown,
  loadAutoRunDelay,
  loadInputs,
  offeredMaps,
  parseRankDisplay,
  saveInputs,
  type SavedInputs,
} from './inputs'
import { ResultFooter } from './ResultFooter'
import { RouteCards } from './RouteCards'
import { predictor, runSimulation } from './runner'
import { initialRunState, isRunning, runReducer, type RunInput } from './state'
import { StatusArea } from './StatusArea'
import { PANEL_CSS } from './styles'
import { Summary } from './Summary'
import { atNode, isAutoPaused, isStale } from './views'

/** The store slices the live fleet display depends on. */
function useLiveState(): PoiState {
  const basic = useSelector((s: PoiState) => s.info?.basic)
  const fleets = useSelector((s: PoiState) => s.info?.fleets)
  const ships = useSelector((s: PoiState) => s.info?.ships)
  const equips = useSelector((s: PoiState) => s.info?.equips)
  const mapInfo = useSelector((s: PoiState) => s.info?.maps)
  const master = useSelector((s: PoiState) => s.const)
  const combinedFlag = useSelector((s: PoiState) => s.sortie?.combinedFlag)
  const sortieStatus = useSelector((s: PoiState) => s.sortie?.sortieStatus)
  const sortieMapId = useSelector((s: PoiState) => s.sortie?.sortieMapId)
  const spotHistory = useSelector((s: PoiState) => s.sortie?.spotHistory)
  return useMemo(
    () => ({
      info: { basic, fleets, ships, equips, maps: mapInfo },
      const: master,
      sortie: { combinedFlag, sortieStatus, sortieMapId, spotHistory },
    }),
    [basic, fleets, ships, equips, mapInfo, master, combinedFlag, sortieStatus, sortieMapId, spotHistory],
  )
}

/** Where the map's kcnav data is (the game-data package's, or the plugin's fetches), for `variant` on an event map. */
function mapKcnavDir(map: string, variant?: string): string | undefined {
  try {
    return kcnavDirFor(gameData(), workDir(), map, variant)
  } catch {
    return undefined
  }
}

/** The map's kcnav topology, from the game-data package, or once its first run has fetched it. */
function mapTopology(map: string): RouteTable | undefined {
  const dir = mapKcnavDir(map)
  return dir ? topologyNow(dir, map) : undefined
}

/** A target; undefined for the boss. */
interface TargetPair {
  target?: string
}

const BOSS_PAIR: TargetPair = { target: undefined }

/** The sortie's visited letters, once its map's topology has been fetched. */
function sortieLetters(sortie: Sortie): string[] | undefined {
  const dir = mapKcnavDir(sortie.map)
  return dir ? cellLettersNow(dir, sortie) : undefined
}

export function Panel() {
  const live = useLiveState()
  const [inputs, setInputs] = useState<SavedInputs>(loadInputs)
  // From the store, so a count set on the settings page reaches the open panel at once.
  const trials = useSelector((s: PoiState) => clampTrials(s.config?.plugin?.poi_battle_sim?.trials))
  // Likewise live: switching it relabels the results on screen, without a run.
  const rankDisplay = useSelector((s: PoiState) => parseRankDisplay(s.config?.plugin?.poi_battle_sim?.rankDisplay))
  const [run, dispatch] = useReducer(runReducer, initialRunState)
  const [fleetOpen, setFleetOpen] = useState(true)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const running = isRunning(run)

  useEffect(() => () => abortRef.current?.abort(), [])

  const update = (patch: Partial<SavedInputs>) => {
    const next = { ...inputs, ...patch }
    setInputs(next)
    saveInputs(next)
  }
  // A data update re-renders: map choices, event gauges and covered maps may change with it.
  const data = useSyncExternalStore(onGameData, gameData)
  const offered = useMemo(() => offeredMaps(live.const?.$maps), [live.const?.$maps])
  const maps = useMemo(
    () => groupMapsByArea(offered, live.const?.$maps, live.const?.$mapareas),
    [offered, live.const?.$maps, live.const?.$mapareas],
  )
  // A remembered map the game data no longer has (an event that ended) gives way to 1-1.
  useEffect(() => {
    if (live.const?.$maps && inputs.map !== null && !offered.includes(inputs.map)) update({ map: '1-1', target: undefined })
  }, [offered])

  const start = (input: RunInput) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    void runSimulation(input, getStoreState() as PoiState | undefined, dispatch, controller.signal)
  }
  // Mid-sortie the run is on the sortie's map, with that map's choices, whatever map is selected (none
  // included). A branch the fleet has passed counts as chosen: the one taken, whatever is remembered.
  const { fleetId } = inputs
  const sortie = fleetId !== null ? sortieOf(live, fleetId) : undefined
  const letters = sortie && sortieLetters(sortie)
  const taken = sortie && letters ? takenBranches(sortie.map, letters) : {}
  // A sortie on another map than the selected one has its own target pair, dropped when that sortie ends.
  const [sortiePair, setSortiePair] = useState<TargetPair & { map: string }>()
  useEffect(() => {
    if (sortiePair && sortiePair.map !== sortie?.map) setSortiePair(undefined)
  }, [sortie?.map])
  const ownPair = sortie !== undefined && sortie.map !== inputs.map
  const pair: TargetPair = ownPair
    ? sortiePair?.map === sortie.map
      ? sortiePair
      : BOSS_PAIR
    : { target: inputs.target }
  const setPair = (patch: Partial<TargetPair>) =>
    ownPair ? setSortiePair({ ...pair, ...patch, map: sortie.map }) : update(patch)
  // Sortie mode shows the sortie's map and its choices; the remembered selection stays as it is.
  const shownMap = sortie?.map ?? inputs.map
  const shownChoices = shownMap !== null ? choicesForMap(inputs, shownMap) : {}
  // An event map's state: the game's, with the user's overrides, or the game's alone mid-sortie.
  const eventGauges = data?.eventGauges ?? {}
  const event =
    shownMap !== null && isEventMap(shownMap)
      ? eventStateFor({
          info: live.info?.maps?.[mapIdOf(shownMap)],
          gauges: eventGauges,
          map: shownMap,
          override: inputs.eventStates[shownMap],
          sortie: sortie !== undefined,
        })
      : undefined
  const eventFromGame =
    shownMap !== null && event
      ? eventStateFor({ info: live.info?.maps?.[mapIdOf(shownMap)], gauges: eventGauges, map: shownMap, sortie: true })
      : undefined
  const variant = event && kcnavVariant(event, thresholdOf(eventGauges, shownMap!, event.difficulty, event.gauge))
  // Until the map's topology is there (in the package, or fetched by its first run), runs use the boss, as before targets.
  const topology = shownMap !== null ? mapTopology(shownMap) : undefined
  const battles = topology && battleNodes(topology)
  const target = battles ? pair.target : undefined
  // What a run would simulate; undefined while there is nothing to run (cleared by Reset).
  const current: RunInput | undefined =
    fleetId === null
      ? undefined
      : sortie
        ? {
            fleetId,
            map: sortie.map,
            choices: { ...choicesForMap(inputs, sortie.map), ...taken },
            trials,
            target,
            formations: inputs.formations[sortie.map] ?? {},
            nightBattles: inputs.nightBattles[sortie.map] ?? {},
            sortie: { cells: sortie.cells },
            ...(event ? { event } : {}),
          }
        : inputs.map !== null
          ? {
              fleetId,
              map: inputs.map,
              choices: choicesForMap(inputs, inputs.map),
              trials,
              target,
              formations: inputs.formations[inputs.map] ?? {},
              nightBattles: inputs.nightBattles[inputs.map] ?? {},
              ...(event ? { event } : {}),
            }
          : undefined
  const simulate = () => current && start(current)

  // Auto-run on a change, not on opening the panel; a change mid-run restarts it. Changes are
  // settled first, for the configured delay (read per change, so a new setting applies at once),
  // so typing a custom trial count or a two-step equipment swap starts one run.
  // With nothing to run the key is 'unselected': picking a target again, even the same one, is a change.
  const loadout = useMemo(() => (fleetId !== null ? fleetLoadout(live, [fleetId]) : undefined), [live, fleetId])
  const autoKey = current ? loadout && JSON.stringify([loadout.key, current]) : 'unselected'
  const lastAutoKey = useRef<string | undefined>(undefined)
  // One pending automatic run, shared by both triggers, so a focus arriving with a change starts one run.
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scheduleAuto = (trigger: 'change' | 'focus') => {
    clearTimeout(autoTimer.current)
    const delay = loadAutoRunDelay()
    devLog('auto.scheduled', { trigger, delay, input: current })
    autoTimer.current = setTimeout(simulate, delay)
  }
  useEffect(() => () => clearTimeout(autoTimer.current), [])
  useEffect(() => {
    clearTimeout(autoTimer.current)
    if (!autoKey) return
    const changed = lastAutoKey.current !== undefined && lastAutoKey.current !== autoKey
    lastAutoKey.current = autoKey
    if (changed && current && inputs.auto && loadout?.complete) scheduleAuto('change')
  }, [autoKey, inputs.auto])

  // The shown map's battle nodes for the Node settings popup. Recomputed as the run moves on too, since a map's first
  // run fetches the enemy data the submarine rules read.
  const savedFormations = shownMap !== null ? inputs.formations[shownMap] : undefined
  const savedNightBattles = shownMap !== null ? inputs.nightBattles[shownMap] : undefined
  // Night battle is fixed at a night-battle node (always) and an air raid (never sent, shown as never).
  const nightLocks = useMemo(
    () =>
      topology
        ? Object.fromEntries(
            [...nodeColors(topology)].flatMap(([letter, color]): [string, NightBattle][] =>
              color === NIGHT_BATTLE_COLOR ? [[letter, 'always']] : color === AIR_RAID_COLOR ? [[letter, 'never']] : [],
            ),
          )
        : {},
    [topology],
  )
  const nodes = useMemo(
    () =>
      shownMap !== null && topology
        ? mapFormations({
            kcnavDir: mapKcnavDir(shownMap, variant?.name) ?? '',
            map: shownMap,
            variant: variant?.name,
            topology,
            $ships: live.const?.$ships,
            user: savedFormations ?? {},
          })
        : undefined,
    [shownMap, topology, live.const?.$ships, savedFormations, run.phase, variant?.name, data],
  )
  const shipCount =
    fleetId !== null ? live.info?.fleets?.find((f) => f.api_id === fleetId)?.api_ship.filter((id) => id > 0).length : undefined
  // Saved, then run at once with them; the key is recorded first, so the auto-run effect sees no change to run for.
  const applyNodeSettings = (settings: NodeSettings) => {
    if (shownMap === null) return
    // The shown map's entries replaced; a map left without any is dropped.
    const put = <T,>(all: Record<string, Record<string, T>>, entries: Record<string, T>) => {
      const { [shownMap]: _, ...others } = all
      return Object.keys(entries).length > 0 ? { ...others, [shownMap]: entries } : others
    }
    update({
      formations: put(inputs.formations, settings.formations),
      nightBattles: put(inputs.nightBattles, settings.nightBattles),
    })
    devLog('nodeSettings.applied', { map: shownMap, ...settings })
    if (!current) return
    const input = { ...current, ...settings }
    clearTimeout(autoTimer.current)
    if (loadout) lastAutoKey.current = JSON.stringify([loadout.key, input])
    start(input)
  }

  // What poi's auto switch compares a game response with (see focus.ts).
  useEffect(() => {
    setShownFleet(loadout && fleetId !== null ? { fleetIds: [fleetId], setup: loadout.setup } : undefined)
  }, [fleetId, loadout?.setup])
  useEffect(() => () => setShownFleet(undefined), [])

  // Coming into view (or opening already in view) with no run starts one. A focus that does not
  // qualify is dropped, and leaving the view keeps a pending run.
  const shown = useSelector(isPluginShown)
  // A popup of the panel is open: the data update prompt waits for it to close.
  const [popupOpen, setPopupOpen] = useState(false)
  const lastShown = useRef(false)
  useEffect(() => {
    const focused = shown && !lastShown.current
    lastShown.current = shown
    if (focused && current && run.phase === 'idle' && inputs.auto && loadout?.complete) scheduleAuto('focus')
  }, [shown])

  // Live before a run; the run's snapshot from its start through its result, at the run's map. With no
  // map to run, LoS shows at ×1; with no fleet, there is nothing to show.
  let fleet: { model?: FleetViewModel; error?: SimError }
  try {
    fleet = run.snapshot
      ? { model: buildFleetViewModel(run.snapshot, live.const ?? {}, run.input?.map) }
      : fleetId !== null
        ? { model: buildFleetViewModel(snapshotFleet(live, fleetId), live.const ?? {}, current?.map) }
        : {}
  } catch (err) {
    fleet = { error: err instanceof SimError ? err : new SimError('INTERNAL', String(err)) }
  }

  const fleetNames = [1, 2, 3, 4].map((id) => live.info?.fleets?.find((f) => f.api_id === id)?.api_name)
  // Nothing to run (a sortie's fleet back in port with no map selected) no longer matches the result either.
  const stale = run.input !== undefined && !running && (!current || isStale(run.input, current))
  // Routes are unknown while predicting; the header and a zeroed summary show already.
  const result =
    (run.routes || run.phase === 'predicting') && run.input && run.snapshot
      ? {
          routes: run.routes,
          input: run.input,
          capturedAt: run.snapshot.capturedAt,
          at: atNode(run.routes),
          sortieUnobserved: run.sortieUnobserved,
          nightBattleAtTarget: run.nightBattleAtTarget,
        }
      : undefined
  const shownFleetId = run.snapshot?.fleetId ?? fleetId

  // Stops everything, as Cancel does, and clears what is on screen: a finished result or an error too.
  const reset = () => {
    abortRef.current?.abort()
    clearTimeout(autoTimer.current)
    dispatch({ type: 'cancelled' })
    update({ fleetId: null, map: null, ...BOSS_PAIR })
  }

  return (
    <div className="battle-sim">
      <style>{PANEL_CSS}</style>
      <Controls
        fleetId={fleetId}
        fleetNames={fleetNames}
        map={shownMap}
        maps={maps}
        choices={shownChoices}
        target={
          shownMap !== null && battles
            ? {
                value: pair.target,
                // Mid-sortie, only the nodes still ahead of the fleet.
                options: predictor.nodesFor(shownMap, letters).filter((node) => battles.has(node)),
                boss: predictor.bossFor(shownMap, letters),
              }
            : undefined
        }
        nodeSettings={
          shownMap !== null && nodes && (
            <NodeSettingsButton
              nodes={nodes}
              saved={{ formations: savedFormations ?? {}, nightBattles: savedNightBattles ?? {} }}
              nightLocks={nightLocks}
              boss={[...nodeColors(topology!)].filter(([, color]) => color === BOSS_COLOR).map(([letter]) => letter)}
              shipCount={shipCount}
              disabled={running}
              onClose={applyNodeSettings}
              onOpenChange={setPopupOpen}
            />
          )
        }
        event={
          event && eventFromGame
            ? {
                state: event,
                fromGame: eventFromGame,
                override: inputs.eventStates[shownMap!] ?? {},
                gauges: gaugesOf(eventGauges, shownMap!, event.difficulty),
                locked: sortie !== undefined,
              }
            : undefined
        }
        onEvent={(override: EventOverride) => {
          if (shownMap === null) return
          const { [shownMap]: _, ...others } = inputs.eventStates
          update({ eventStates: Object.keys(override).length > 0 ? { ...others, [shownMap]: override } : others })
        }}
        decided={taken}
        sortieMode={sortie !== undefined}
        auto={inputs.auto}
        autoPaused={isAutoPaused(inputs.auto, loadout, shipCount)}
        running={running}
        canSimulate={current !== undefined}
        onFleet={(fleetId) => update({ fleetId })}
        // A target is a node of one map, so another map starts again at the boss.
        onMap={(map) => update({ map, ...BOSS_PAIR })}
        onChoice={(key, value) =>
          shownMap !== null && update({ choices: { ...inputs.choices, [shownMap]: { ...shownChoices, [key]: value } } })
        }
        onTarget={(target) => setPair({ target })}
        onAuto={(auto) => {
          update({ auto })
          // Turned back on while the result is dimmed: catch up at once, not after the next change. Started here,
          // not through the timer, which the input-change effect clears when Auto changes.
          if (auto && current && stale && loadout?.complete) {
            clearTimeout(autoTimer.current)
            devLog('auto.resumed', { input: current })
            simulate()
          }
        }}
        onSimulate={simulate}
        onCancel={() => abortRef.current?.abort()}
        onReset={reset}
      />

      <div className="battle-sim-section">
        <div className="battle-sim-section-head" onClick={() => setFleetOpen(!fleetOpen)}>
          <span>{fleetOpen ? '▾' : '▸'}</span>
          <span>{shownFleetId !== null ? t('Fleet {id}', { id: shownFleetId }) : t('Fleet')}</span>
          {!run.snapshot && (
            <Tag minimal intent="success">
              {t('Live')}
            </Tag>
          )}
        </div>
        {fleetOpen &&
          (fleet.model ? (
            <FleetView model={fleet.model} />
          ) : fleet.error ? (
            <div className="battle-sim-muted">{errorSummary(fleet.error.code)}</div>
          ) : (
            <div className="battle-sim-muted">{t('Pick a fleet')}</div>
          ))}
      </div>

      {result && (
        <div className={`battle-sim-section battle-sim-result${stale ? ' battle-sim-stale' : ''}`}>
          <Summary routes={result.routes} mode={rankDisplay} target={result.input.target} />
        </div>
      )}

      <div className={`battle-sim-body${stale ? ' battle-sim-stale' : ''}`}>
        {run.phase === 'error' && run.error && (
          <ErrorView error={run.error} onRetry={run.input ? () => start(run.input!) : undefined} />
        )}
        {result?.routes && <RouteCards routes={result.routes} mode={rankDisplay} target={result.input.target} />}
      </div>

      <ResultFooter
        result={result}
        stale={stale}
        status={<StatusArea run={run} />}
        dataUpdate={<DataUpdate canAutoOpen={shown && !popupOpen} />}
      />
    </div>
  )
}
