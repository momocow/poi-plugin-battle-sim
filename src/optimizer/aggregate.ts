/**
 * Combine per-route simulation results by route probability.
 *
 * Only rates over all of a route's trials (`ranks_marginal`, `reach_boss_rate`,
 * `boss_sunk_rate`) are weighted; routes that miss the boss contribute 0. The
 * rank rates among trials that reached the boss are, per route, the
 * optimizer's conditional `ranks`; overall they are the weighted marginal rate
 * divided by the weighted reach-boss rate — never a weighted average of the
 * per-route conditional rates — and undefined when the boss is never reached.
 * "Lost a ship" is weighted only over the simulated routes, renormalized.
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
  /** Over the simulated routes only; undefined when none was simulated. */
  shipLostSimulated: number | undefined
}

const zeroRanks = (): RankRates => Object.fromEntries(RANKS.map((r) => [r, 0])) as RankRates

export function aggregate(routes: WeightedRoute[]): Aggregate {
  const ranks = zeroRanks()
  let reachBoss = 0
  let bossSunk = 0
  let simulatedWeight = 0
  let shipLost = 0
  for (const { probability: p, diag } of routes) {
    if (!diag) continue
    for (const r of RANKS) ranks[r] += p * diag.ranks_marginal[r]
    reachBoss += p * diag.reach_boss_rate
    bossSunk += p * diag.boss_sunk_rate
    simulatedWeight += p
    shipLost += p * diag.player_sunk_any_rate
  }
  return {
    reachBoss,
    ranks,
    ranksAtBoss:
      reachBoss > 0 ? (Object.fromEntries(RANKS.map((r) => [r, ranks[r] / reachBoss])) as RankRates) : undefined,
    bossSunk,
    shipLostSimulated: simulatedWeight > 0 ? shipLost / simulatedWeight : undefined,
  }
}

/** B rank or worse: B + C + D + E. */
export const bOrWorse = (r: RankRates): number => r.B + r.C + r.D + r.E
