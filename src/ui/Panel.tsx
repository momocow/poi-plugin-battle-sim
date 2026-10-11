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
 * equipment, the map, the route choices or the trial count (set on poi's
 * settings page, and followed live) change, once every
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
 * Reset clears the fleet and map: it stops any run, drops a pending automatic
 * run and clears the result, and until both are picked again nothing runs,
 * by hand or by itself. A selected fleet that sorties still runs in sortie
 * mode, which never uses the selected map.
 */
import { Tag } from '@blueprintjs/core'
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { devLog } from '../devlog'
import { SimError } from '../errors'
import { buildFleetViewModel, type FleetViewModel } from '../fleet-view/model'
import { FleetView } from '../fleet-view/FleetView'
import { fleetLoadout, snapshotFleet } from '../fleet/snapshot'
import type { PoiState } from '../fleet/types'
import { t } from '../i18n'
import { kcnavDir } from '../optimizer/run'
import { workDir } from '../paths'
import { getStoreState } from '../poi'
import { cellLettersNow, sortieOf, takenBranches, type Sortie } from '../routes/sortie'
import { Controls } from './Controls'
import { errorSummary, ErrorView } from './ErrorView'
import { setShownFleet } from './focus'
import {
  choicesForMap,
  clampTrials,
  groupMapsByArea,
  isPluginShown,
  loadAutoRunDelay,
  loadInputs,
  normalMaps,
  parseRankDisplay,
  saveInputs,
  type SavedInputs,
} from './inputs'
import { ResultFooter } from './ResultFooter'
import { RouteCards } from './RouteCards'
import { runSimulation } from './runner'
import { initialRunState, isRunning, runReducer, type RunInput } from './state'
import { StatusArea } from './StatusArea'
import { PANEL_CSS } from './styles'
import { Summary } from './Summary'
import { atNode, isStale } from './views'

/** The store slices the live fleet display depends on. */
function useLiveState(): PoiState {
  const basic = useSelector((s: PoiState) => s.info?.basic)
  const fleets = useSelector((s: PoiState) => s.info?.fleets)
  const ships = useSelector((s: PoiState) => s.info?.ships)
  const equips = useSelector((s: PoiState) => s.info?.equips)
  const master = useSelector((s: PoiState) => s.const)
  const combinedFlag = useSelector((s: PoiState) => s.sortie?.combinedFlag)
  const sortieStatus = useSelector((s: PoiState) => s.sortie?.sortieStatus)
  const sortieMapId = useSelector((s: PoiState) => s.sortie?.sortieMapId)
  const spotHistory = useSelector((s: PoiState) => s.sortie?.spotHistory)
  return useMemo(
    () => ({
      info: { basic, fleets, ships, equips },
      const: master,
      sortie: { combinedFlag, sortieStatus, sortieMapId, spotHistory },
    }),
    [basic, fleets, ships, equips, master, combinedFlag, sortieStatus, sortieMapId, spotHistory],
  )
}

/** The sortie's visited letters, once its map's topology has been fetched. */
function sortieLetters(sortie: Sortie): string[] | undefined {
  try {
    return cellLettersNow(kcnavDir(workDir()), sortie)
  } catch {
    return undefined
  }
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
  const maps = useMemo(
    () => groupMapsByArea(normalMaps(live.const?.$maps), live.const?.$maps, live.const?.$mapareas),
    [live.const?.$maps, live.const?.$mapareas],
  )

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
            sortie: { cells: sortie.cells },
          }
        : inputs.map !== null
          ? { fleetId, map: inputs.map, choices: choicesForMap(inputs, inputs.map), trials }
          : undefined
  const simulate = () => current && start(current)
  // Sortie mode shows the sortie's map and its choices; the remembered selection stays as it is.
  const shownMap = sortie?.map ?? inputs.map
  const shownChoices = shownMap !== null ? choicesForMap(inputs, shownMap) : {}

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

  // What poi's auto switch compares a game response with (see focus.ts).
  useEffect(() => {
    setShownFleet(loadout && fleetId !== null ? { fleetIds: [fleetId], setup: loadout.setup } : undefined)
  }, [fleetId, loadout?.setup])
  useEffect(() => () => setShownFleet(undefined), [])

  // Coming into view (or opening already in view) with no run starts one. A focus that does not
  // qualify is dropped, and leaving the view keeps a pending run.
  const shown = useSelector(isPluginShown)
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
        }
      : undefined
  const shownFleetId = run.snapshot?.fleetId ?? fleetId

  // Stops everything, as Cancel does, and clears what is on screen: a finished result or an error too.
  const reset = () => {
    abortRef.current?.abort()
    clearTimeout(autoTimer.current)
    dispatch({ type: 'cancelled' })
    update({ fleetId: null, map: null })
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
        decided={taken}
        sortieMode={sortie !== undefined}
        auto={inputs.auto}
        running={running}
        canSimulate={current !== undefined}
        onFleet={(fleetId) => update({ fleetId })}
        onMap={(map) => update({ map })}
        onChoice={(key, value) =>
          shownMap !== null && update({ choices: { ...inputs.choices, [shownMap]: { ...shownChoices, [key]: value } } })
        }
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
          <Summary routes={result.routes} mode={rankDisplay} />
        </div>
      )}

      <div className={`battle-sim-body${stale ? ' battle-sim-stale' : ''}`}>
        {run.phase === 'error' && run.error && (
          <ErrorView error={run.error} onRetry={run.input ? () => start(run.input!) : undefined} />
        )}
        {result?.routes && <RouteCards routes={result.routes} mode={rankDisplay} />}
      </div>

      <ResultFooter result={result} stale={stale} status={<StatusArea run={run} />} />
    </div>
  )
}
