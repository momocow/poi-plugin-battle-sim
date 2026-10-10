/** What a result was run with — map, fleet, snapshot time, trials and its margin of error, choices — and whether the settings have moved on since. */
import React from 'react'

import { t } from '../i18n'
import { describeChoices } from '../routes/choices'
import type { RunInput } from './state'
import { marginOfError, pct } from './views'

export function ResultHeader({ input, capturedAt, stale }: { input: RunInput; capturedAt: number; stale: boolean }) {
  const choices = describeChoices(input.map, input.choices, t('Phase'))
  const parts = [
    input.map,
    t('Fleet {id}', { id: input.fleetId }),
    t('Snapshot {time}', { time: new Date(capturedAt).toLocaleTimeString() }),
    t('{trials} trials per route', { trials: input.trials }),
    `±${pct(marginOfError(input.trials))}`,
    ...(choices ? [choices] : []),
  ]
  return (
    <div className="battle-sim-result-header">
      <div className="battle-sim-muted">{parts.join(' · ')}</div>
      {stale && <div className="bp6-text-muted">{t('Settings have changed since this result')}</div>}
    </div>
  )
}
