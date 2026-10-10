/**
 * The plugin panel: controls → status → fleet (collapsible) → summary → route table.
 *
 * Before a run the fleet display follows the live store; from the start of a
 * run it shows the run's snapshot. The fleet for a run is read from the store
 * at the moment Simulate is clicked.
 */
import { Tag } from '@blueprintjs/core'
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

import { SimError } from '../errors'
import { buildFleetViewModel, type FleetViewModel } from '../fleet-view/model'
import { FleetView } from '../fleet-view/FleetView'
import { snapshotFleet } from '../fleet/snapshot'
import type { PoiState } from '../fleet/types'
import { t } from '../i18n'
import { getStoreState } from '../poi'
import { Controls } from './Controls'
import { errorSummary, ErrorView } from './ErrorView'
import { choicesForMap, clampTrials, loadInputs, normalMaps, saveInputs, type SavedInputs } from './inputs'
import { RouteTable } from './RouteTable'
import { runSimulation } from './runner'
import { initialRunState, isRunning, progress, runReducer, type RunInput } from './state'
import { PANEL_CSS } from './styles'
import { Summary } from './Summary'

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
  const maps = useMemo(() => normalMaps(live.const?.$maps), [live.const?.$maps])

  const start = (input: RunInput) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    void runSimulation(input, getStoreState() as PoiState | undefined, dispatch, controller.signal)
  }
  const simulate = () => start({ fleetId: inputs.fleetId, map: inputs.map, choices, trials: inputs.trials })

  // Live before a run; the run's snapshot from its start through its result.
  let fleet: { model?: FleetViewModel; error?: SimError; capturedAt?: number }
  try {
    fleet = run.snapshot
      ? { model: buildFleetViewModel(run.snapshot, live.const ?? {}), capturedAt: run.snapshot.capturedAt }
      : { model: buildFleetViewModel(snapshotFleet(live, inputs.fleetId), live.const ?? {}) }
  } catch (err) {
    fleet = { error: err instanceof SimError ? err : new SimError('INTERNAL', String(err)) }
  }

  const { finished, total } = progress(run)
  return (
    <div className="battle-sim">
      <style>{PANEL_CSS}</style>
      <Controls
        fleetId={inputs.fleetId}
        map={inputs.map}
        maps={maps}
        choices={choices}
        trials={inputs.trials}
        running={running}
        onFleet={(fleetId) => update({ fleetId })}
        onMap={(map) => update({ map })}
        onChoice={(key, value) => update({ choices: { ...inputs.choices, [inputs.map]: { ...choices, [key]: value } } })}
        onTrials={(trials) => update({ trials: clampTrials(trials) })}
        onSimulate={simulate}
        onCancel={() => abortRef.current?.abort()}
      />

      <div className="battle-sim-status">
        {run.phase === 'predicting' && <span>{t('Predicting routes…')}</span>}
        {run.phase === 'simulating' && <span>{t('Simulating {finished} / {total}', { finished, total })}</span>}
        {run.phase === 'simulating' && run.fetchingEnemyData && (
          <span className="battle-sim-muted">{t('First run of this map — fetching enemy data, this may take a minute or more')}</span>
        )}
        {run.phase === 'done' && <span>{t('Done')}</span>}
        {run.devOptimizer && <Tag intent="warning">{t('Development optimizer')}</Tag>}
      </div>
      {run.phase === 'error' && run.error && (
        <ErrorView error={run.error} onRetry={run.input ? () => start(run.input!) : undefined} />
      )}

      <div>
        <div className="battle-sim-section-head" onClick={() => setFleetOpen(!fleetOpen)}>
          <span>{fleetOpen ? '▾' : '▸'}</span>
          <span>{t('Fleet {id}', { id: run.snapshot?.fleetId ?? inputs.fleetId })}</span>
          {fleet.capturedAt !== undefined ? (
            <Tag minimal>{t('Snapshot {time}', { time: new Date(fleet.capturedAt).toLocaleTimeString() })}</Tag>
          ) : (
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

      {run.routes && run.input && run.snapshot && (
        <>
          {run.phase === 'done' && <Summary routes={run.routes} input={run.input} capturedAt={run.snapshot.capturedAt} />}
          <RouteTable routes={run.routes} />
        </>
      )}
    </div>
  )
}
