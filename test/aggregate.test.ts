import { describe, expect, it } from 'vitest'

import { aggregate, aOrBetter, bOrBetter } from '../src/optimizer/aggregate'
import type { RankRates, SimulateDiag } from '../src/optimizer/run'

const ranks = (S: number, rest: Partial<RankRates> = {}): RankRates => ({ S, A: 0, B: 0, C: 0, D: 0, E: 0, ...rest })

/** A diag from a reach-boss rate and the conditional S rate at the boss. */
const diag = (reach: number, sAtBoss: number, extra: Partial<SimulateDiag> = {}): SimulateDiag => ({
  ranks: ranks(sAtBoss),
  ranks_marginal: ranks(reach * sAtBoss),
  reach_boss_rate: reach,
  boss_sunk_rate: 0,
  per_node_reach: [reach],
  route: [{ node: 'A', battleIndex: 0 }],
  ...extra,
})

describe('aggregate', () => {
  it('weights all-trial rates by route probability (0.68)', () => {
    const a = aggregate([
      { probability: 0.6, diag: diag(1, 0.8) },
      { probability: 0.4, diag: diag(1, 0.5) },
    ])
    expect(a.ranks.S).toBeCloseTo(0.68, 10)
  })

  it('lets retreats reduce the overall rate (0.72, not 0.8)', () => {
    const a = aggregate([{ probability: 1, diag: diag(0.9, 0.8) }])
    expect(a.ranks.S).toBeCloseTo(0.72, 10)
    expect(a.ranksAtBoss?.S).toBeCloseTo(0.8, 10)
  })

  it('derives the rate at the boss from the weighted rates (0.5)', () => {
    const a = aggregate([
      { probability: 0.28, diag: diag(1, 0.5) },
      { probability: 0.3 },
      { probability: 0.42 },
    ])
    expect(a.ranks.S).toBeCloseTo(0.14, 10)
    expect(a.reachBoss).toBeCloseTo(0.28, 10)
    expect(a.ranksAtBoss?.S).toBeCloseTo(0.5, 10)
  })

  it('does not average conditional rates across routes with different retreat rates (≈0.667)', () => {
    const a = aggregate([
      { probability: 0.5, diag: diag(1, 0.8) },
      { probability: 0.5, diag: diag(0.5, 0.4) },
    ])
    expect(a.ranksAtBoss?.S).toBeCloseTo(0.5 / 0.75, 10)
  })

  it('leaves the rate at the boss undefined when the boss is never reached', () => {
    const a = aggregate([{ probability: 1, diag: diag(0, 0) }])
    expect(a.ranksAtBoss).toBeUndefined()
    expect(aggregate([{ probability: 1 }]).ranksAtBoss).toBeUndefined()
  })

  it('counts boss sinking over all trials', () => {
    const a = aggregate([{ probability: 0.5, diag: diag(1, 0.5, { boss_sunk_rate: 0.6 }) }, { probability: 0.5 }])
    expect(a.bossSunk).toBeCloseTo(0.3, 10)
  })

  it('sums cumulative ranks (S 0.5, A or better 0.7, B or better 0.8)', () => {
    const marginal = ranks(0.5, { A: 0.2, B: 0.1, C: 0.05 })
    const a = aggregate([
      { probability: 1, diag: diag(0.85, 0, { ranks_marginal: marginal, ranks: ranks(0.5 / 0.85) }) },
    ])
    expect(a.ranks.S).toBeCloseTo(0.5, 10)
    expect(aOrBetter(a.ranks)).toBeCloseTo(0.7, 10)
    expect(bOrBetter(a.ranks)).toBeCloseTo(0.8, 10)
    expect(bOrBetter(a.ranksAtBoss!)).toBeCloseTo(0.8 / 0.85, 10)
  })
})
