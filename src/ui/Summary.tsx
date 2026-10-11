/**
 * The overall result above the route cards: S, A and B per sortie, A and B on
 * their own or as A or better and B or better by the rank display, each with
 * its rate when the boss is reached, then reach-boss and boss-sunk. Every
 * value reads 0 until the routes are known and each boss route has finished.
 */
import React from 'react'

import { t } from '../i18n'
import type { RankDisplay } from './inputs'
import type { RouteRow } from './state'
import { pct, summaryCells, type RateCells } from './views'

const ZERO: RateCells = {
  reachBoss: 0,
  s: 0,
  a: 0,
  b: 0,
  bossSunk: 0,
  sAtBoss: 0,
  aAtBoss: 0,
  bAtBoss: 0,
  bossSunkAtBoss: 0,
}

export function Summary({ routes, mode }: { routes: RouteRow[] | undefined; mode: RankDisplay }) {
  const cells = (routes && summaryCells(routes, mode)) ?? ZERO
  const cumulative = mode === 'cumulative'
  const primary: [string, string, number, number | undefined][] = [
    [t('S'), 'battle-sim-rank-s', cells.s, cells.sAtBoss],
    [cumulative ? t('A or better') : t('A'), 'battle-sim-rank-a', cells.a, cells.aAtBoss],
    [cumulative ? t('B or better') : t('B'), 'battle-sim-rank-b', cells.b, cells.bAtBoss],
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
