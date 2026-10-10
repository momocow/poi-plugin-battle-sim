/**
 * What the route table and the summary show, as plain values.
 *
 * Per-route cells count all of that route's trials, so each column weighted
 * by the route's probability adds up to the summary's value; the "at boss"
 * values sit next to them and are not weighted.
 */
import { aggregate, bOrWorse, type Aggregate } from '../optimizer/aggregate'
import type { RouteRow } from './state'

/** `['1','A','B','C2','D']` → `A-B-C2-D`, plus `[Boss]` when the last node is the boss. */
export function formatRoute(nodes: string[], reachesBoss: boolean): string {
  const text = nodes.slice(1).join('-')
  return reachesBoss ? `${text}[Boss]` : text
}

/** One decimal place; undefined (no trial reached the boss) shows as "—". */
export const pct = (x: number | undefined): string => (x === undefined ? '—' : `${(x * 100).toFixed(1)}%`)

export interface RateCells {
  reachBoss: number
  s: number
  a: number
  bOrWorse: number
  bossSunk: number
  shipLost: number | undefined
  sAtBoss: number | undefined
  aAtBoss: number | undefined
  bOrWorseAtBoss: number | undefined
}

export type RowCells =
  | { kind: 'not-simulated' }
  | { kind: 'pending' }
  | ({ kind: 'done' } & RateCells)

export function rowCells(row: RouteRow): RowCells {
  if (!row.reachesBoss) return { kind: 'not-simulated' }
  if (!row.diag) return { kind: 'pending' }
  const d = row.diag
  const reached = d.reach_boss_rate > 0
  return {
    kind: 'done',
    reachBoss: d.reach_boss_rate,
    s: d.ranks_marginal.S,
    a: d.ranks_marginal.A,
    bOrWorse: bOrWorse(d.ranks_marginal),
    bossSunk: d.boss_sunk_rate,
    shipLost: d.player_sunk_any_rate,
    sAtBoss: reached ? d.ranks.S : undefined,
    aAtBoss: reached ? d.ranks.A : undefined,
    bOrWorseAtBoss: reached ? bOrWorse(d.ranks) : undefined,
  }
}

/** The summary, once every boss route has a result; undefined before that. */
export function summaryCells(routes: RouteRow[]): RateCells | undefined {
  if (routes.some((r) => r.reachesBoss && !r.diag)) return undefined
  const a: Aggregate = aggregate(routes.map((r) => ({ probability: r.probability, diag: r.diag })))
  return {
    reachBoss: a.reachBoss,
    s: a.ranks.S,
    a: a.ranks.A,
    bOrWorse: bOrWorse(a.ranks),
    bossSunk: a.bossSunk,
    shipLost: a.shipLostSimulated,
    sAtBoss: a.ranksAtBoss?.S,
    aAtBoss: a.ranksAtBoss?.A,
    bOrWorseAtBoss: a.ranksAtBoss ? bOrWorse(a.ranksAtBoss) : undefined,
  }
}
