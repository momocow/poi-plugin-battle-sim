/** Fleet, map, branch and phase choices, trials, and Simulate / Cancel. */
import { Button, HTMLSelect } from '@blueprintjs/core'
import React from 'react'

import { t } from '../i18n'
import { choicesFor, type ChoiceValues } from '../routes/choices'
import { MAX_TRIALS } from './inputs'

export interface ControlsProps {
  fleetId: number
  map: string
  maps: string[]
  choices: ChoiceValues
  trials: number
  running: boolean
  onFleet: (fleetId: number) => void
  onMap: (map: string) => void
  onChoice: (key: string, value: string) => void
  onTrials: (trials: number) => void
  onSimulate: () => void
  onCancel: () => void
}

type ChangeEvent = { currentTarget: { value: string } }

export function Controls(p: ControlsProps) {
  const mapChoices = choicesFor(p.map)
  const maps = p.maps.includes(p.map) ? p.maps : [p.map, ...p.maps]
  return (
    <div className="battle-sim-controls">
      <div className="battle-sim-control-row">
        <label>
          {t('Fleet')}{' '}
          <HTMLSelect
            value={p.fleetId}
            disabled={p.running}
            onChange={(e: ChangeEvent) => p.onFleet(Number(e.currentTarget.value))}
            options={[1, 2, 3, 4].map((id) => ({ value: id, label: String(id) }))}
          />
        </label>
        <label>
          {t('Map')}{' '}
          <HTMLSelect
            value={p.map}
            disabled={p.running}
            onChange={(e: ChangeEvent) => p.onMap(e.currentTarget.value)}
            options={maps}
          />
        </label>
        <label>
          {t('Trials')}{' '}
          <input
            className="bp6-input battle-sim-trials"
            type="number"
            min={1}
            max={MAX_TRIALS}
            step={100}
            value={p.trials}
            disabled={p.running}
            onChange={(e) => p.onTrials(Number(e.currentTarget.value))}
          />
        </label>
      </div>
      {(mapChoices.branches.length > 0 || mapChoices.phases) && (
        <div className="battle-sim-control-row">
          {mapChoices.branches.map((b) => (
            <label key={b.node}>
              {`${b.node} → ${b.targets.join(' / ')}`}{' '}
              <HTMLSelect
                value={p.choices[b.node]}
                disabled={p.running}
                onChange={(e: ChangeEvent) => p.onChoice(b.node, e.currentTarget.value)}
                options={b.targets}
              />
            </label>
          ))}
          {mapChoices.phases && (
            <label>
              {t('Phase')}{' '}
              <HTMLSelect
                value={p.choices.phase}
                disabled={p.running}
                onChange={(e: ChangeEvent) => p.onChoice('phase', e.currentTarget.value)}
                options={mapChoices.phases.map((ph) => ({ value: ph.value, label: `${ph.value}: ${t(ph.label)}` }))}
              />
            </label>
          )}
        </div>
      )}
      <div className="battle-sim-control-row">
        <Button intent="primary" disabled={p.running} onClick={p.onSimulate}>
          {t('Simulate')}
        </Button>
        <Button disabled={!p.running} onClick={p.onCancel}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}
