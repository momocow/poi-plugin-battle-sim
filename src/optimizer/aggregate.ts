/**
 * Combine per-route simulation results by route probability.
 *
 * Only rates over all of a route's trials (`ranks_marginal`, `reach_boss_rate`,
 * `boss_sunk_rate`) are weighted; routes that miss the boss contribute 0. The
 * rank rates among trials that reached the boss are, per route, the
 * optimizer's conditional `ranks`; overall they are the weighted marginal rate
 * divided by the weighted reach-boss rate — never a weighted average of the
 * per-route conditional rates — and undefined when the boss is never reached.
 */
import { RANKS, type RankRates, type SimulateDiag } from './run'

export interface WeightedRoute {
  probability: number
  /** Undefined for a route that does not reach the boss (not simulated). */
  diag?: SimulateDiag
}

export interface Aggregate {
  reachBoss: number
  /** Over all trials, probability-weighted. */
  ranks: RankRates
  /** Among trials that reached the boss; undefined when the boss is never reached. */
  ranksAtBoss: RankRates | undefined
  bossSunk: number
}

const zeroRanks = (): RankRates => Object.fromEntries(RANKS.map((r) => [r, 0])) as RankRates

export function aggregate(routes: WeightedRoute[]): Aggregate {
  const ranks = zeroRanks()
  let reachBoss = 0
  let bossSunk = 0
  for (const { probability: p, diag } of routes) {
    if (!diag) continue
    for (const r of RANKS) ranks[r] += p * diag.ranks_marginal[r]
    reachBoss += p * diag.reach_boss_rate
    bossSunk += p * diag.boss_sunk_rate
  }
  return {
    reachBoss,
    ranks,
    ranksAtBoss:
      reachBoss > 0 ? (Object.fromEntries(RANKS.map((r) => [r, ranks[r] / reachBoss])) as RankRates) : undefined,
    bossSunk,
  }
}

/** A or better: S + A. Over the same denominator as `r`, so it works on conditional rates too. */
export const aOrBetter = (r: RankRates): number => r.S + r.A
/** B or better, a victory: S + A + B. */
export const bOrBetter = (r: RankRates): number => r.S + r.A + r.B
