import { describe, expect, it } from 'vitest'

import type { RankRates, SimulateDiag } from '../src/optimizer/run'
import { initialRunState, progress, runReducer, sortRoutes, type RouteRow, type RunState } from '../src/ui/state'
import { formatRoute, pct, rowCells, summaryCells } from '../src/ui/views'
import { SimError } from '../src/errors'
import type { FleetSnapshot } from '../src/fleet/types'

const ranks = (S: number, A = 0, B = 0): RankRates => ({ S, A, B, C: 0, D: 0, E: 0 })
const diag = (reach: number, s: number, a = 0, b = 0, extra: Partial<SimulateDiag> = {}): SimulateDiag => ({
  ranks: ranks(s, a, b),
  ranks_marginal: ranks(reach * s, reach * a, reach * b),
  reach_boss_rate: reach,
  boss_sunk_rate: reach * 0.5,
  player_sunk_any_rate: 0.02,
  ...extra,
})

describe('route text', () => {
  it('drops the start node, joins with -, and marks a boss last node', () => {
    expect(formatRoute(['1', 'A', 'B', 'C2', 'D'], true)).toBe('A-B-C2-D[Boss]')
    expect(formatRoute(['1', 'C', 'D'], false)).toBe('C-D')
    expect(formatRoute(['2', 'I', 'O', 'Q1', 'S'], false)).toBe('I-O-Q1-S')
  })

  it('formats percentages to one decimal place and undefined as —', () => {
    expect(pct(0.42)).toBe('42.0%')
    expect(pct(0.6666)).toBe('66.7%')
    expect(pct(undefined)).toBe('—')
  })
})

describe('route table', () => {
  const rows = (): RouteRow[] =>
    sortRoutes<RouteRow>([
      { nodes: ['1', 'C', 'D'], probability: 0.3, reachesBoss: false },
      { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42, reachesBoss: false },
      { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28, reachesBoss: true },
    ])

  it('lists 2-5 by probability with only the boss row simulated', () => {
    const r = rows()
    expect(r.map((x) => [formatRoute(x.nodes, x.reachesBoss), pct(x.probability)])).toEqual([
      ['C-E-G-L-N', '42.0%'],
      ['C-D', '30.0%'],
      ['C-E-G-L-O[Boss]', '28.0%'],
    ])
    expect(r.map((x) => rowCells(x).kind)).toEqual(['not-simulated', 'not-simulated', 'pending'])
  })

  it('shows both the all-trials and the at-boss rate per route', () => {
    const cells = rowCells({ nodes: ['1', 'O'], probability: 1, reachesBoss: true, diag: diag(0.9, 0.8) })
    expect(cells.kind === 'done' && [pct(cells.s), pct(cells.sAtBoss)]).toEqual(['72.0%', '80.0%'])
  })

  it('keeps the summary hidden until every boss route has finished', () => {
    const r = rows()
    expect(summaryCells(r)).toBeUndefined()
    r[2] = { ...r[2]!, diag: diag(1, 0.5) }
    const summary = summaryCells(r)!
    expect([pct(summary.s), pct(summary.sAtBoss)]).toEqual(['14.0%', '50.0%'])
  })

  it('makes the summary equal the probability-weighted sum of the table columns', () => {
    const r = sortRoutes([
      { nodes: ['1', 'A', 'O'], probability: 0.5, reachesBoss: true, diag: diag(1, 0.8, 0.1, 0.1) },
      { nodes: ['1', 'B', 'O'], probability: 0.3, reachesBoss: true, diag: diag(0.5, 0.4, 0.3, 0.3, { player_sunk_any_rate: 0.1 }) },
      { nodes: ['1', 'B', 'C'], probability: 0.2, reachesBoss: false },
    ])
    const summary = summaryCells(r)!
    const weighted = (key: 'reachBoss' | 's' | 'a' | 'bOrWorse' | 'bossSunk') =>
      r.reduce((sum, row) => {
        const c = rowCells(row)
        return sum + (c.kind === 'done' ? row.probability * c[key] : 0)
      }, 0)
    for (const key of ['reachBoss', 's', 'a', 'bOrWorse', 'bossSunk'] as const) {
      expect(summary[key]).toBeCloseTo(weighted(key), 12)
    }
    expect(summary.sAtBoss).toBeCloseTo(summary.s / summary.reachBoss, 12)
    expect(summary.shipLost).toBeCloseTo((0.5 * 0.02 + 0.3 * 0.1) / 0.8, 12)
  })
})

describe('run state machine', () => {
  const snapshot: FleetSnapshot = { fleetId: 1, capturedAt: 0, hqLevel: 120, ships: [] }
  const input = { fleetId: 1, map: '2-5', choices: {}, trials: 2000 }
  const routes = sortRoutes([
    { nodes: ['1', 'C', 'D'], probability: 0.3, reachesBoss: false },
    { nodes: ['1', 'O'], probability: 0.7, reachesBoss: true },
  ])

  it('goes idle → predicting → simulating → done without a confirmation step', () => {
    let s: RunState = runReducer(initialRunState, { type: 'start', input, snapshot })
    expect(s.phase).toBe('predicting')
    s = runReducer(s, { type: 'predicted', routes, devOptimizer: false })
    expect(s.phase).toBe('simulating')
    expect(progress(s)).toEqual({ finished: 0, total: 1 })
    s = runReducer(s, { type: 'routeDone', index: 0, diag: diag(1, 1) })
    expect(progress(s)).toEqual({ finished: 1, total: 1 })
    s = runReducer(s, { type: 'finished' })
    expect(s.phase).toBe('done')
    expect(s.snapshot).toBe(snapshot)
  })

  it('cancel returns to idle with nothing kept', () => {
    let s = runReducer(initialRunState, { type: 'start', input, snapshot })
    s = runReducer(s, { type: 'predicted', routes, devOptimizer: false })
    expect(runReducer(s, { type: 'cancelled' })).toEqual(initialRunState)
  })

  it('a failure leaves the running phases and drops partial results', () => {
    let s = runReducer(initialRunState, { type: 'start', input, snapshot })
    s = runReducer(s, { type: 'predicted', routes, devOptimizer: false })
    s = runReducer(s, { type: 'failed', error: new SimError('OPTIMIZER_FAILED', 'boom') })
    expect(s.phase).toBe('error')
    expect(s.routes).toBeUndefined()
  })

  it('a run rejected before it starts keeps nothing of the previous run', () => {
    let s = runReducer(initialRunState, { type: 'start', input, snapshot })
    s = runReducer(s, { type: 'predicted', routes, devOptimizer: false })
    s = runReducer(s, { type: 'finished' })
    s = runReducer(s, { type: 'failed', error: new SimError('FLEET_EMPTY', 'empty'), input })
    expect(s).toEqual({ phase: 'error', error: expect.any(SimError), input })
  })

  it('ignores a late result after a cancel', () => {
    const s = runReducer(initialRunState, { type: 'routeDone', index: 0, diag: diag(1, 1) })
    expect(s).toEqual(initialRunState)
  })
})
