/** The overall result above the route table, shown once every boss route has finished. */
import React from 'react'

import { t } from '../i18n'
import { describeChoices } from '../routes/choices'
import type { RunInput, RouteRow } from './state'
import { pct, summaryCells } from './views'

export function Summary({ routes, input, capturedAt }: { routes: RouteRow[]; input: RunInput; capturedAt: number }) {
  const cells = summaryCells(routes)
  if (!cells) return null
  const choices = describeChoices(input.map, input.choices, t('Phase'))
  const both = (all: number, atBoss: number | undefined) => `${pct(all)} / ${pct(atBoss)}`
  const rows: [string, string][] = [
    [t('Reach boss'), pct(cells.reachBoss)],
    [`${t('S')} (${t('all trials')} / ${t('at boss')})`, both(cells.s, cells.sAtBoss)],
    [`${t('A')} (${t('all trials')} / ${t('at boss')})`, both(cells.a, cells.aAtBoss)],
    [`${t('≤B')} (${t('all trials')} / ${t('at boss')})`, both(cells.bOrWorse, cells.bOrWorseAtBoss)],
    [t('Boss sunk'), pct(cells.bossSunk)],
    [t('Ship lost (simulated routes only)'), pct(cells.shipLost)],
  ]
  return (
    <div className="battle-sim-summary">
      {rows.map(([label, value]) => (
        <div key={label} className="battle-sim-kv">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="battle-sim-muted">
        {t('{map}, snapshot {time}, {trials} trials per route', {
          map: input.map,
          time: new Date(capturedAt).toLocaleTimeString(),
          trials: input.trials,
        })}
        {choices && ` — ${choices}`}
      </div>
    </div>
  )
}
