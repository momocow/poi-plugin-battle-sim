/**
 * The overall result above the route cards: S, A or better and B or better
 * per sortie, each with its rate when the boss is reached, then reach-boss and
 * boss-sunk. Every value reads 0 until the routes are known and each boss
 * route has finished.
 */
import React from 'react'

import { t } from '../i18n'
import type { RouteRow } from './state'
import { pct, summaryCells, type RateCells } from './views'

const ZERO: RateCells = {
  reachBoss: 0,
  s: 0,
  aPlus: 0,
  bPlus: 0,
  bossSunk: 0,
  sAtBoss: 0,
  aPlusAtBoss: 0,
  bPlusAtBoss: 0,
  bossSunkAtBoss: 0,
}

export function Summary({ routes }: { routes: RouteRow[] | undefined }) {
  const cells = (routes && summaryCells(routes)) ?? ZERO
  const primary: [string, string, number, number | undefined][] = [
    [t('S'), 'battle-sim-rank-s', cells.s, cells.sAtBoss],
    [t('A or better'), 'battle-sim-rank-a', cells.aPlus, cells.aPlusAtBoss],
    [t('B or better'), 'battle-sim-rank-b', cells.bPlus, cells.bPlusAtBoss],
  ]
  return (
    <div className="battle-sim-summary">
      <div className="battle-sim-summary-ranks">
        {primary.map(([label, rankClass, all, atBoss]) => (
          <div key={label} className={`battle-sim-summary-rank ${rankClass}`}>
            <div className="battle-sim-muted">{label}</div>
            <div className="battle-sim-big">{pct(all)}</div>
            <div className="battle-sim-muted">{t('{rate} when reached', { rate: pct(atBoss) })}</div>
          </div>
        ))}
      </div>
      <div className="battle-sim-summary-extra">
        <span>
          {t('Reach boss')} <strong>{pct(cells.reachBoss)}</strong>
        </span>
        <span>
          {t('Boss sunk')} <strong>{pct(cells.bossSunk)}</strong>
        </span>
      </div>
    </div>
  )
}
