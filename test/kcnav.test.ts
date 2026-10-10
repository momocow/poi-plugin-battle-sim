import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isMapCached } from '../src/optimizer/kcnav'
import { initialRunState, runReducer } from '../src/ui/state'
import { tempDir } from './helpers'

describe('kcnav cache check', () => {
  it('treats a map as cached once its _map.json exists, whatever its nodes', () => {
    const dir = tempDir()
    expect(isMapCached(dir, '5-2')).toBe(false)
    mkdirSync(join(dir, '5-2'))
    writeFileSync(join(dir, '5-2', 'B.json'), '{}')
    expect(isMapCached(dir, '5-2')).toBe(false)
    writeFileSync(join(dir, '5-2', '_map.json'), '{}')
    expect(isMapCached(dir, '5-2')).toBe(true)
    expect(isMapCached(dir, '2-5')).toBe(false)
  })

  it('shows the fetching status until the first route finishes', () => {
    const snapshot = { fleetId: 1, capturedAt: 0, hqLevel: 1, ships: [] }
    let s = runReducer(initialRunState, { type: 'start', input: { fleetId: 1, map: '5-2', choices: {}, trials: 1 }, snapshot })
    s = runReducer(s, { type: 'predicted', routes: [{ nodes: ['1', 'O'], probability: 1, reachesBoss: true }], devOptimizer: false, fetchingEnemyData: true })
    expect(s.fetchingEnemyData).toBe(true)
    const diag = { ranks: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, ranks_marginal: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, reach_boss_rate: 1, boss_sunk_rate: 1, player_sunk_any_rate: 0 }
    s = runReducer(s, { type: 'routeDone', index: 0, diag })
    expect(s.fetchingEnemyData).toBe(false)
  })
})
