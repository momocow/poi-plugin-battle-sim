/**
 * The overall result above the route cards: S, A and B per sortie, A and B on
 * their own or as A or better and B or better by the rank display, each with
 * its rate when the target is reached, then reach-target and flagship-sunk,
 * labeled with the run's target. Every value reads 0 until the routes are
 * known and each route reaching the target has finished.
 */
import React from 'react'

import { t } from '../i18n'
import type { RankDisplay } from './inputs'
import type { RouteRow } from './state'
import { pct, summaryCells, targetLabels, type SummaryCells } from './views'

const ZERO: SummaryCells = {
  reachTarget: 0,
  s: 0,
  a: 0,
  b: 0,
  targetSunk: 0,
  sAtTarget: 0,
  aAtTarget: 0,
  bAtTarget: 0,
  targetSunkAtTarget: 0,
}

/** `target` is the run's, undefined for the boss. */
export function Summary({
  routes,
  mode,
  target,
}: {
  routes: RouteRow[] | undefined
  mode: RankDisplay
  target: string | undefined
}) {
  const cells = (routes && summaryCells(routes, mode)) ?? ZERO
  const labels = targetLabels(target)
  const cumulative = mode === 'cumulative'
  const primary: [string, string, number | undefined, number | undefined][] = [
    [t('S'), 'battle-sim-rank-s', cells.s, cells.sAtTarget],
    [cumulative ? t('A or better') : t('A'), 'battle-sim-rank-a', cells.a, cells.aAtTarget],
    [cumulative ? t('B or better') : t('B'), 'battle-sim-rank-b', cells.b, cells.bAtTarget],
  ]
  return (
    <div className="battle-sim-summary">
      <div className="battle-sim-summary-ranks">
        {primary.map(([label, rankClass, all, atTarget]) => (
          <div key={label} className={`battle-sim-summary-rank ${rankClass}`}>
            <div className="battle-sim-muted">{label}</div>
            <div className="battle-sim-big">{pct(all)}</div>
            <div className="battle-sim-muted">{t('{rate} when reached', { rate: pct(atTarget) })}</div>
          </div>
        ))}
      </div>
      <div className="battle-sim-summary-extra">
        <span>
          {labels.reach} <strong>{pct(cells.reachTarget)}</strong>
        </span>
        <span>
          {labels.sunk} <strong>{pct(cells.targetSunk)}</strong>
        </span>
      </div>
    </div>
  )
}
