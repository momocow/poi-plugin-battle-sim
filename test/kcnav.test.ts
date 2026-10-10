import { describe, expect, it } from 'vitest'

import { initialRunState, runReducer } from '../src/ui/state'

describe('enemy-data fetching status', () => {
  it('shows until the shared fetch ends, not until the first route finishes', () => {
    const snapshot = { fleetId: 1, capturedAt: 0, hqLevel: 1, ships: [] }
    let s = runReducer(initialRunState, { type: 'start', input: { fleetId: 1, map: '5-2', choices: {}, trials: 1 }, snapshot })
    s = runReducer(s, { type: 'predicted', routes: [{ nodes: ['1', 'O'], probability: 1, reachesBoss: true }], devOptimizer: false, fetchingEnemyData: true })
    expect(s.fetchingEnemyData).toBe(true)
    const diag = { ranks: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, ranks_marginal: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, reach_boss_rate: 1, boss_sunk_rate: 1, per_node_reach: [1], route: [{ node: 'O', battleIndex: 0 }] }
    s = runReducer(s, { type: 'routeDone', index: 0, diag })
    expect(s.fetchingEnemyData).toBe(true)
    s = runReducer(s, { type: 'enemyDataReady' })
    expect(s.fetchingEnemyData).toBe(false)
  })

  it('ignores enemyDataReady once the run is no longer simulating', () => {
    expect(runReducer(initialRunState, { type: 'enemyDataReady' })).toBe(initialRunState)
  })
})
