/**
 * What the route cards, the summary and the result header show, as plain values.
 *
 * Per-route cells count all of that route's trials, so each value weighted
 * by the route's probability adds up to the summary's value; the "when
 * reached" values sit next to them and are not weighted.
 */
import { aggregate, aOrBetter, bOrBetter, type Aggregate } from '../optimizer/aggregate'
import type { SimulateDiag } from '../optimizer/run'
import type { RouteRow, RunInput } from './state'

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
  aPlus: number
  bPlus: number
  bossSunk: number
  /** Among trials that reached the boss; undefined when none did. */
  sAtBoss: number | undefined
  aPlusAtBoss: number | undefined
  bPlusAtBoss: number | undefined
  bossSunkAtBoss: number | undefined
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
    aPlus: aOrBetter(d.ranks_marginal),
    bPlus: bOrBetter(d.ranks_marginal),
    bossSunk: d.boss_sunk_rate,
    sAtBoss: reached ? d.ranks.S : undefined,
    aPlusAtBoss: reached ? aOrBetter(d.ranks) : undefined,
    bPlusAtBoss: reached ? bOrBetter(d.ranks) : undefined,
    bossSunkAtBoss: reached ? d.boss_sunk_rate / d.reach_boss_rate : undefined,
  }
}

/** The summary, once every boss route has a result; undefined before that. */
export function summaryCells(routes: RouteRow[]): RateCells | undefined {
  if (routes.some((r) => r.reachesBoss && !r.diag)) return undefined
  const a: Aggregate = aggregate(routes.map((r) => ({ probability: r.probability, diag: r.diag })))
  return {
    reachBoss: a.reachBoss,
    s: a.ranks.S,
    aPlus: aOrBetter(a.ranks),
    bPlus: bOrBetter(a.ranks),
    bossSunk: a.bossSunk,
    sAtBoss: a.ranksAtBoss?.S,
    aPlusAtBoss: a.ranksAtBoss ? aOrBetter(a.ranksAtBoss) : undefined,
    bPlusAtBoss: a.ranksAtBoss ? bOrBetter(a.ranksAtBoss) : undefined,
    bossSunkAtBoss: a.reachBoss > 0 ? a.bossSunk / a.reachBoss : undefined,
  }
}

export interface NodeRate {
  node: string
  rate: number
}

/**
 * Share of all trials reaching each route node, start excluded. The
 * optimizer's rates cover battle nodes only; a node without a battle takes the
 * next node's rate, since a fleet only turns back after a battle. Walking
 * backwards from the boss gives that in one pass.
 */
export function routeReach(diag: SimulateDiag): NodeRate[] {
  const out: NodeRate[] = new Array(diag.route.length)
  let next = diag.reach_boss_rate
  for (let i = diag.route.length - 1; i >= 0; i--) {
    const { node, battleIndex } = diag.route[i]!
    next = battleIndex === null ? next : diag.per_node_reach[battleIndex]!
    out[i] = { node, rate: next }
  }
  return out
}

/**
 * Where trials turned back: each node's reach minus the next node's, in route
 * order, leaving out drops that would show as 0.0%.
 */
export const retreats = (reach: NodeRate[]): NodeRate[] =>
  reach.flatMap(({ node, rate }, i) => {
    const drop = i + 1 < reach.length ? rate - reach[i + 1]!.rate : 0
    return Math.round(drop * 1000) >= 1 ? [{ node, rate: drop }] : []
  })

/** The worst-case (p = 0.5) 95% interval of one route's rate, as a fraction: 0.98 / √trials. */
export const marginOfError = (trials: number): number => 0.98 / Math.sqrt(trials)

/** Whether `current` would run something other than `run`: another fleet, map, trial count or choice. */
export function isStale(run: RunInput, current: RunInput): boolean {
  if (run.fleetId !== current.fleetId || run.map !== current.map || run.trials !== current.trials) return true
  const keys = new Set([...Object.keys(run.choices), ...Object.keys(current.choices)])
  return [...keys].some((k) => run.choices[k] !== current.choices[k])
}

/** A finished route's S, A-or-better and B-or-better rates weighted by its probability: its share of the summary. */
function weightedRanks(row: RouteRow): [number, number, number] {
  const d = row.diag
  if (!d) return [0, 0, 0]
  const p = row.probability
  return [p * d.ranks_marginal.S, p * aOrBetter(d.ranks_marginal), p * bOrBetter(d.ranks_marginal)]
}

/**
 * Card order, most promising first: finished routes by weighted S, then
 * weighted A or better, then weighted B or better, all highest first; then
 * routes still simulating; then routes that do not reach the boss. Ties, and
 * the order within the last two groups, go by probability, highest first.
 */
export function sortForCards(routes: RouteRow[]): RouteRow[] {
  const group = (r: RouteRow) => (r.diag ? 0 : r.reachesBoss ? 1 : 2)
  return [...routes].sort((a, b) => {
    const [wa, wb] = [weightedRanks(a), weightedRanks(b)]
    return (
      group(a) - group(b) ||
      wb[0] - wa[0] ||
      wb[1] - wa[1] ||
      wb[2] - wa[2] ||
      b.probability - a.probability
    )
  })
}
