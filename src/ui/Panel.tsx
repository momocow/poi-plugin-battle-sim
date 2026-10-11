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
 * A run also starts by itself when the selected fleet, its ships or equipment,
 * the map, the route choices or the trial count change, once every ship has
 * all its main slots filled and the inputs have settled for the delay set on
 * poi's settings page, unless the automatic-run switch is off.
 */
import { Tag } from '@blueprintjs/core'
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { SimError } from '../errors'
import { buildFleetViewModel, type FleetViewModel } from '../fleet-view/model'
import { FleetView } from '../fleet-view/FleetView'
import { fleetLoadout, snapshotFleet } from '../fleet/snapshot'
import type { PoiState } from '../fleet/types'
import { t } from '../i18n'
import { getStoreState } from '../poi'
import { Controls } from './Controls'
import { errorSummary, ErrorView } from './ErrorView'
import {
  choicesForMap,
  clampTrials,
  groupMapsByArea,
  loadAutoRunDelay,
  loadInputs,
  normalMaps,
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
import { isStale } from './views'

/** The store slices the live fleet display depends on. */
function useLiveState(): PoiState {
  const basic = useSelector((s: PoiState) => s.info?.basic)
  const fleets = useSelector((s: PoiState) => s.info?.fleets)
  const ships = useSelector((s: PoiState) => s.info?.ships)
  const equips = useSelector((s: PoiState) => s.info?.equips)
  const master = useSelector((s: PoiState) => s.const)
  const combinedFlag = useSelector((s: PoiState) => s.sortie?.combinedFlag)
  return useMemo(
    () => ({ info: { basic, fleets, ships, equips }, const: master, sortie: { combinedFlag } }),
    [basic, fleets, ships, equips, master, combinedFlag],
  )
}

export function Panel() {
  const live = useLiveState()
  const [inputs, setInputs] = useState<SavedInputs>(loadInputs)
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
  const choices = choicesForMap(inputs, inputs.map)
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
  const current: RunInput = { fleetId: inputs.fleetId, map: inputs.map, choices, trials: inputs.trials }
  const simulate = () => start(current)

  // Auto-run on a change, not on opening the panel; a change mid-run restarts it. Changes are
  // settled first, for the configured delay (read per change, so a new setting applies at once),
  // so typing a custom trial count or a two-step equipment swap starts one run.
  const loadout = useMemo(() => fleetLoadout(live, [inputs.fleetId]), [live, inputs.fleetId])
  const autoKey = loadout && JSON.stringify([inputs.fleetId, loadout.key, inputs.map, choices, inputs.trials])
  const lastAutoKey = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!autoKey) return
    const changed = lastAutoKey.current !== undefined && lastAutoKey.current !== autoKey
    lastAutoKey.current = autoKey
    if (!changed || !inputs.auto || !loadout?.complete) return
    const timer = setTimeout(simulate, loadAutoRunDelay())
    return () => clearTimeout(timer)
  }, [autoKey, inputs.auto])

  // Live before a run; the run's snapshot from its start through its result, at the run's map.
  let fleet: { model?: FleetViewModel; error?: SimError }
  try {
    fleet = run.snapshot
      ? { model: buildFleetViewModel(run.snapshot, live.const ?? {}, run.input?.map ?? inputs.map) }
      : { model: buildFleetViewModel(snapshotFleet(live, inputs.fleetId), live.const ?? {}, inputs.map) }
  } catch (err) {
    fleet = { error: err instanceof SimError ? err : new SimError('INTERNAL', String(err)) }
  }

  const fleetNames = [1, 2, 3, 4].map((id) => live.info?.fleets?.find((f) => f.api_id === id)?.api_name)
  const stale = run.input !== undefined && !running && isStale(run.input, current)
  // Routes are unknown while predicting; the header and a zeroed summary show already.
  const result =
    (run.routes || run.phase === 'predicting') && run.input && run.snapshot
      ? { routes: run.routes, input: run.input, capturedAt: run.snapshot.capturedAt }
      : undefined
  return (
    <div className="battle-sim">
      <style>{PANEL_CSS}</style>
      <Controls
        fleetId={inputs.fleetId}
        fleetNames={fleetNames}
        map={inputs.map}
        maps={maps}
        choices={choices}
        trials={inputs.trials}
        auto={inputs.auto}
        running={running}
        onFleet={(fleetId) => update({ fleetId })}
        onMap={(map) => update({ map })}
        onChoice={(key, value) => update({ choices: { ...inputs.choices, [inputs.map]: { ...choices, [key]: value } } })}
        onTrials={(trials) => update({ trials: clampTrials(trials) })}
        onAuto={(auto) => update({ auto })}
        onSimulate={simulate}
        onCancel={() => abortRef.current?.abort()}
      />

      <div className="battle-sim-section">
        <div className="battle-sim-section-head" onClick={() => setFleetOpen(!fleetOpen)}>
          <span>{fleetOpen ? '▾' : '▸'}</span>
          <span>{t('Fleet {id}', { id: run.snapshot?.fleetId ?? inputs.fleetId })}</span>
          {!run.snapshot && (
            <Tag minimal intent="success">
              {t('Live')}
            </Tag>
          )}
        </div>
        {fleetOpen &&
          (fleet.model ? (
            <FleetView model={fleet.model} />
          ) : (
            fleet.error && <div className="battle-sim-muted">{errorSummary(fleet.error.code)}</div>
          ))}
      </div>

      {result && (
        <div className={`battle-sim-section battle-sim-result${stale ? ' battle-sim-stale' : ''}`}>
          <Summary routes={result.routes} />
        </div>
      )}

      <div className={`battle-sim-body${stale ? ' battle-sim-stale' : ''}`}>
        {run.phase === 'error' && run.error && (
          <ErrorView error={run.error} onRetry={run.input ? () => start(run.input!) : undefined} />
        )}
        {result?.routes && <RouteCards routes={result.routes} />}
      </div>

      <ResultFooter result={result} stale={stale} status={<StatusArea run={run} />} />
    </div>
  )
}
