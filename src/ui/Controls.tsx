/**
 * Fleet, map, branch and phase choices, trials, the automatic-run switch, and
 * the Simulate / Cancel button.
 */
import { Button, HTMLSelect, Switch } from '@blueprintjs/core'
import React, { useState } from 'react'

import { gameName, t } from '../i18n'
import { choicesFor, type ChoiceValues } from '../routes/choices'
import { isTrialPreset, MAX_TRIALS, TRIAL_PRESETS, type MapGroup } from './inputs'

export interface ControlsProps {
  fleetId: number
  /** In-game fleet names by fleet id − 1; missing before the game data loads. */
  fleetNames: (string | undefined)[]
  map: string
  /** Offered maps, grouped by sea area. */
  maps: MapGroup[]
  choices: ChoiceValues
  trials: number
  auto: boolean
  running: boolean
  onFleet: (fleetId: number) => void
  onMap: (map: string) => void
  onChoice: (key: string, value: string) => void
  onTrials: (trials: number) => void
  onAuto: (auto: boolean) => void
  onSimulate: () => void
  onCancel: () => void
}

type ChangeEvent = { currentTarget: { value: string } }

const CUSTOM = 'custom'

export function Controls(p: ControlsProps) {
  const mapChoices = choicesFor(p.map)
  // A remembered map that is not offered (e.g. before the game data loads) still shows, ungrouped.
  const mapOffered = p.maps.some((g) => g.maps.some((m) => m.map === p.map))
  // Custom stays chosen even when its count happens to equal a preset.
  const [custom, setCustom] = useState(() => !isTrialPreset(p.trials))
  const presetLabels = [t('Quick'), t('Normal'), t('Precise')]
  const trialOptions = [
    ...TRIAL_PRESETS.map((n, i) => ({
      value: String(n),
      label: `${presetLabels[i]} (${n})`,
    })),
    { value: CUSTOM, label: t('Custom') },
  ]
  const onTrialPreset = (value: string) => {
    if (value === CUSTOM) {
      setCustom(true)
    } else {
      setCustom(false)
      p.onTrials(Number(value))
    }
  }
  return (
    <div className="battle-sim-controls">
      <div className="battle-sim-control-row">
        <label>
          {t('Fleet')}{' '}
          <HTMLSelect
            value={p.fleetId}
            disabled={p.running}
            onChange={(e: ChangeEvent) => p.onFleet(Number(e.currentTarget.value))}
            options={[1, 2, 3, 4].map((id) => {
              const name = p.fleetNames[id - 1]
              return { value: id, label: name ? `${id}: ${name}` : String(id) }
            })}
          />
        </label>
        <label>
          {t('Map')}{' '}
          <HTMLSelect
            className="battle-sim-map-select"
            value={p.map}
            disabled={p.running}
            onChange={(e: ChangeEvent) => p.onMap(e.currentTarget.value)}
          >
            {!mapOffered && <option value={p.map}>{p.map}</option>}
            {p.maps.map((g) => (
              <optgroup key={g.area} label={g.name ? `${g.area}: ${gameName(g.name)}` : String(g.area)}>
                {g.maps.map(({ map, name }) => (
                  // The closed select shows the selected option's label, so that one stays short.
                  <option key={map} value={map}>
                    {name && map !== p.map ? `${map} ${gameName(name)}` : map}
                  </option>
                ))}
              </optgroup>
            ))}
          </HTMLSelect>
        </label>
        {p.running ? (
          <Button onClick={p.onCancel}>{t('Cancel')}</Button>
        ) : (
          <Button intent="primary" onClick={p.onSimulate}>
            {t('Simulate')}
          </Button>
        )}
        <Switch
          className="battle-sim-auto"
          checked={p.auto}
          label={t('Auto')}
          title={t('Simulate when the fleet or these settings change')}
          onChange={(e: { currentTarget: { checked: boolean } }) => p.onAuto(e.currentTarget.checked)}
        />
      </div>
      <div className="battle-sim-control-row">
        <label>
          {t('Trials')}{' '}
          <HTMLSelect
            value={custom ? CUSTOM : String(p.trials)}
            disabled={p.running}
            onChange={(e: ChangeEvent) => onTrialPreset(e.currentTarget.value)}
            options={trialOptions}
          />
        </label>
        {custom && (
          <input
            className="bp6-input battle-sim-trials"
            type="number"
            min={1}
            max={MAX_TRIALS}
            step={100}
            value={p.trials}
            disabled={p.running}
            aria-label={t('Trials')}
            onChange={(e) => p.onTrials(Number(e.currentTarget.value))}
          />
        )}
      </div>
      {(mapChoices.branches.length > 0 || mapChoices.phases) && (
        <div className="battle-sim-control-row">
          {mapChoices.branches.map((b) => (
            <label key={b.node}>
              {`${b.node} →`}{' '}
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
                options={mapChoices.phases.map((ph) => ({
                  value: ph.value,
                  label: `${ph.value}: ${t(ph.label)}`,
                }))}
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}
