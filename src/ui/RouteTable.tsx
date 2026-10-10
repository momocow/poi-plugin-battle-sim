/**
 * Route table for a narrow panel: each route's text on its own full-width
 * line, its numbers in a row below, and each rank's rate at the boss stacked
 * under its all-trials rate in the same cell.
 */
import React from 'react'

import { t } from '../i18n'
import type { RouteRow } from './state'
import { formatRoute, pct, rowCells } from './views'

function Stacked({ all, atBoss }: { all: string; atBoss?: string }) {
  return (
    <div className="battle-sim-cell">
      <div>{all}</div>
      {atBoss !== undefined && <div className="battle-sim-muted">{atBoss}</div>}
    </div>
  )
}

export function RouteTable({ routes }: { routes: RouteRow[] }) {
  return (
    <div className="battle-sim-table">
      <div className="battle-sim-row battle-sim-header">
        <Stacked all={t('Probability')} />
        <Stacked all={t('Reach boss')} />
        <Stacked all={t('S (all trials)')} atBoss={t('S (at boss)')} />
        <Stacked all={t('A (all trials)')} atBoss={t('A (at boss)')} />
        <Stacked all={t('≤B (all trials)')} atBoss={t('≤B (at boss)')} />
        <Stacked all={t('Boss sunk')} />
        <Stacked all={t('Ship lost')} />
      </div>
      {routes.map((route, i) => {
        const cells = rowCells(route)
        return (
          <div key={i} className="battle-sim-route">
            <div className="battle-sim-route-text">{formatRoute(route.nodes, route.reachesBoss)}</div>
            <div className="battle-sim-row">
              <Stacked all={pct(route.probability)} />
              {cells.kind === 'done' ? (
                <>
                  <Stacked all={pct(cells.reachBoss)} />
                  <Stacked all={pct(cells.s)} atBoss={pct(cells.sAtBoss)} />
                  <Stacked all={pct(cells.a)} atBoss={pct(cells.aAtBoss)} />
                  <Stacked all={pct(cells.bOrWorse)} atBoss={pct(cells.bOrWorseAtBoss)} />
                  <Stacked all={pct(cells.bossSunk)} />
                  <Stacked all={pct(cells.shipLost)} />
                </>
              ) : (
                <div className="battle-sim-span battle-sim-muted">
                  {cells.kind === 'pending' ? t('Simulating…') : t('Not simulated (does not reach the boss)')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
