import { describe, expect, it } from 'vitest'

import type { RankRates, SimulateDiag } from '../src/optimizer/run'
import {
  initialRunState,
  progress,
  runReducer,
  sortRoutes,
  targetRouteIndexes,
  type RouteRow,
  type RunState,
} from '../src/ui/state'
import {
  formatRoute,
  isStale,
  marginOfError,
  pct,
  retreats,
  routeReach,
  rowCells,
  sortForCards,
  summaryCells,
  targetLabels,
} from '../src/ui/views'
import { SimError } from '../src/errors'
import type { FleetSnapshot } from '../src/fleet/types'

const ranks = (S: number, A = 0, B = 0): RankRates => ({ S, A, B, C: 0, D: 0, E: 0 })
const diag = (reach: number, s: number, a = 0, b = 0, extra: Partial<SimulateDiag> = {}): SimulateDiag => ({
  ranks: ranks(s, a, b),
  ranks_marginal: ranks(reach * s, reach * a, reach * b),
  reach_boss_rate: reach,
  boss_sunk_rate: reach * 0.5,
  per_node_reach: [reach],
  route: [{ node: 'O', battleIndex: 0 }],
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

describe('route cards', () => {
  const rows = (): RouteRow[] =>
    sortRoutes<RouteRow>([
      { nodes: ['1', 'C', 'D'], probability: 0.3, reachesTarget: false, endsAtBoss: false },
      { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42, reachesTarget: false, endsAtBoss: false },
      { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28, reachesTarget: true, endsAtBoss: true },
    ])

  it('lists 2-5 by probability with only the boss row simulated', () => {
    const r = rows()
    expect(r.map((x) => [formatRoute(x.nodes, x.endsAtBoss), pct(x.probability)])).toEqual([
      ['C-E-G-L-N', '42.0%'],
      ['C-D', '30.0%'],
      ['C-E-G-L-O[Boss]', '28.0%'],
    ])
    expect(r.map((x) => rowCells(x, 'individual').kind)).toEqual(['not-simulated', 'not-simulated', 'pending'])
  })

  it('shows both the all-trials and the at-boss rate per route', () => {
    const cells = rowCells({ nodes: ['1', 'O'], probability: 1, reachesTarget: true, endsAtBoss: true, diag: diag(0.9, 0.8) }, 'individual')
    expect(cells.kind === 'done' && [pct(cells.s), pct(cells.sAtTarget)]).toEqual(['72.0%', '80.0%'])
  })

  it('keeps the summary hidden until every boss route has finished', () => {
    const r = rows()
    expect(summaryCells(r, 'individual')).toBeUndefined()
    r[2] = { ...r[2]!, diag: diag(1, 0.5) }
    const summary = summaryCells(r, 'individual')!
    expect([pct(summary.s), pct(summary.sAtTarget)]).toEqual(['14.0%', '50.0%'])
  })

  it.each(['individual', 'cumulative'] as const)('makes the summary equal the probability-weighted sum of the table columns (%s)', (mode) => {
    const r = sortRoutes([
      { nodes: ['1', 'A', 'O'], probability: 0.5, reachesTarget: true, endsAtBoss: true, diag: diag(1, 0.8, 0.1, 0.1) },
      { nodes: ['1', 'B', 'O'], probability: 0.3, reachesTarget: true, endsAtBoss: true, diag: diag(0.5, 0.4, 0.3, 0.3) },
      { nodes: ['1', 'B', 'C'], probability: 0.2, reachesTarget: false, endsAtBoss: false },
    ])
    const summary = summaryCells(r, mode)!
    const weighted = (key: 'reachTarget' | 's' | 'a' | 'b' | 'targetSunk') =>
      r.reduce((sum, row) => {
        const c = rowCells(row, mode)
        return sum + (c.kind === 'done' ? row.probability * c[key] : 0)
      }, 0)
    for (const key of ['reachTarget', 's', 'a', 'b', 'targetSunk'] as const) {
      expect(summary[key]).toBeCloseTo(weighted(key), 12)
    }
    expect(summary.sAtTarget).toBeCloseTo(summary.s! / summary.reachTarget, 12)
    expect(summary.bAtTarget).toBeCloseTo(summary.b! / summary.reachTarget, 12)
  })

  // Over all trials S 0.4, A 0.2, B 0.1; when reached (0.8) S 0.5, A 0.25, B 0.125.
  const done = { nodes: ['1', 'O'], probability: 1, reachesTarget: true, endsAtBoss: true, diag: diag(0.8, 0.5, 0.25, 0.125) }

  it('gives individual ranks per route by default, over all trials and when reached', () => {
    const cells = rowCells(done, 'individual')
    if (cells.kind !== 'done') throw new Error('expected a result')
    expect([cells.s, cells.a, cells.b].map(pct)).toEqual(['40.0%', '20.0%', '10.0%'])
    expect([cells.sAtTarget, cells.aAtTarget, cells.bAtTarget].map(pct)).toEqual(['50.0%', '25.0%', '12.5%'])
    // diag() sinks the boss in half of the trials that reach it: 0.4 of all trials, over 0.8 reached.
    expect(pct(cells.targetSunkAtTarget)).toBe('50.0%')
  })

  it('gives cumulative ranks per route when set to', () => {
    const cells = rowCells(done, 'cumulative')
    if (cells.kind !== 'done') throw new Error('expected a result')
    expect([cells.s, cells.a, cells.b].map(pct)).toEqual(['40.0%', '60.0%', '70.0%'])
    expect([cells.sAtTarget, cells.aAtTarget, cells.bAtTarget].map(pct)).toEqual(['50.0%', '75.0%', '87.5%'])
  })

  it('shows the summary in either mode', () => {
    const cells = (mode: 'individual' | 'cumulative') => {
      const c = summaryCells([done], mode)!
      return [c.s, c.a, c.b, c.sAtTarget, c.aAtTarget, c.bAtTarget].map(pct)
    }
    expect(cells('individual')).toEqual(['40.0%', '20.0%', '10.0%', '50.0%', '25.0%', '12.5%'])
    expect(cells('cumulative')).toEqual(['40.0%', '60.0%', '70.0%', '50.0%', '75.0%', '87.5%'])
  })
})

describe('card order', () => {
  it('ranks finished routes by weighted S, then A or better, then B or better; then pending, then not simulated', () => {
    const routes: RouteRow[] = [
      { nodes: ['1', 'A'], probability: 0.3, reachesTarget: false, endsAtBoss: false },
      // Weighted S 0.2 × 0.5 = 0.1.
      { nodes: ['1', 'B', 'O'], probability: 0.2, reachesTarget: true, endsAtBoss: true, diag: diag(1, 0.5, 0.1) },
      { nodes: ['1', 'C', 'O'], probability: 0.1, reachesTarget: true, endsAtBoss: true },
      // Weighted S 0.1, tied with B; weighted A or better 0.1 against B's 0.12: after B.
      { nodes: ['1', 'D', 'O'], probability: 0.1, reachesTarget: true, endsAtBoss: true, diag: diag(1, 1) },
      // Same S and A or better as B, higher B or better: before B.
      { nodes: ['1', 'E', 'O'], probability: 0.2, reachesTarget: true, endsAtBoss: true, diag: diag(1, 0.5, 0.1, 0.2) },
      { nodes: ['1', 'F', 'O'], probability: 0.1, reachesTarget: false, endsAtBoss: false },
      // Highest weighted S (0.4 × 0.5) despite retreating in half its trials.
      { nodes: ['1', 'G', 'O'], probability: 0.4, reachesTarget: true, endsAtBoss: true, diag: diag(0.5, 1) },
    ]
    expect(sortForCards(routes).map((r) => r.nodes[1])).toEqual(['G', 'E', 'B', 'D', 'C', 'A', 'F'])
    expect(routes[0]!.nodes[1]).toBe('A')
    // The order does not depend on the rank display: ordering the finished routes by weighted S, then A, then B
    // on their own gives the same order as the cumulative values.
    const individual = routes
      .filter((r) => r.diag)
      .map((r) => ({ node: r.nodes[1], w: [r.diag!.ranks_marginal.S, r.diag!.ranks_marginal.A, r.diag!.ranks_marginal.B].map((x) => r.probability * x) }))
      .sort((x, y) => y.w[0]! - x.w[0]! || y.w[1]! - x.w[1]! || y.w[2]! - x.w[2]!)
      .map((x) => x.node)
    expect(individual).toEqual(['G', 'E', 'B', 'D'])
  })
})

describe('retreats by node', () => {
  const line = (d: SimulateDiag) => retreats(routeReach(d)).map((r) => `${r.node} ${pct(r.rate)}`)

  it('reads 5-2 with a battle at every node', () => {
    const d = diag(0.59, 1, 0, 0, {
      per_node_reach: [1.0, 0.893, 0.86, 0.713, 0.59],
      route: ['B', 'C', 'E', 'F', 'O'].map((node, i) => ({ node, battleIndex: i })),
    })
    expect(line(d)).toEqual(['B 10.7%', 'C 3.3%', 'E 14.7%', 'F 12.3%'])
    expect(routeReach(d).at(-1)?.rate).toBe(0.59)
  })

  it('gives an empty node the next battle’s reach (2-3 B-E-F-J-N)', () => {
    const d = diag(0.7, 1, 0, 0, {
      per_node_reach: [1.0, 0.9, 0.8, 0.7],
      route: [
        { node: 'B', battleIndex: null },
        { node: 'E', battleIndex: 0 },
        { node: 'F', battleIndex: 1 },
        { node: 'J', battleIndex: 2 },
        { node: 'N', battleIndex: 3 },
      ],
    })
    expect(routeReach(d).map((r) => `${r.node} ${pct(r.rate)}`)).toEqual([
      'B 100.0%',
      'E 100.0%',
      'F 90.0%',
      'J 80.0%',
      'N 70.0%',
    ])
    expect(line(d)).toEqual(['E 10.0%', 'F 10.0%', 'J 10.0%'])
  })

  it('leaves out drops that would show as 0.0%', () => {
    const d = diag(0.9996, 1, 0, 0, {
      per_node_reach: [1, 0.9996],
      route: [
        { node: 'A', battleIndex: 0 },
        { node: 'B', battleIndex: 1 },
      ],
    })
    expect(retreats(routeReach(d))).toEqual([])
  })
})

describe('result footer', () => {
  const input = { fleetId: 1, map: '7-5', choices: { F: 'J', H: 'I', O: 'P' }, trials: 2000, nightBattle: true, formations: {} }

  it('gives ±2.2% for 2000 trials', () => {
    expect(pct(marginOfError(2000))).toBe('2.2%')
  })

  it('is stale when the fleet, map, trials or a choice changes', () => {
    expect(isStale(input, { ...input, choices: { ...input.choices } })).toBe(false)
    expect(isStale(input, { ...input, fleetId: 2 })).toBe(true)
    expect(isStale(input, { ...input, map: '1-5', choices: {} })).toBe(true)
    expect(isStale(input, { ...input, trials: 500 })).toBe(true)
    expect(isStale(input, { ...input, choices: { ...input.choices, H: 'K' } })).toBe(true)
  })

  it('shows a target the fleet has passed as reached, with nothing simulated and no rates', () => {
    const passed: RouteRow = {
      nodes: ['1', 'C', 'E'],
      probability: 1,
      reachesTarget: true,
      endsAtBoss: false,
      passedTarget: true,
      from: 3,
    }
    expect(rowCells(passed, 'individual')).toEqual({ kind: 'passed' })
    expect(targetRouteIndexes([passed])).toEqual([])
    const summary = summaryCells([passed], 'individual')!
    expect(summary.reachTarget).toBe(1)
    expect([summary.s, summary.a, summary.b, summary.targetSunk, summary.sAtTarget].map(pct)).toEqual([
      '—',
      '—',
      '—',
      '—',
      '—',
    ])
  })

  it('is stale when the target, night battle or a formation changes', () => {
    expect(isStale(input, { ...input, target: 'E' })).toBe(true)
    expect(isStale({ ...input, target: 'E' }, { ...input, target: 'E' })).toBe(false)
    expect(isStale(input, { ...input, nightBattle: false })).toBe(true)
    expect(isStale(input, { ...input, formations: { K: 'Diamond' } })).toBe(true)
    expect(isStale({ ...input, formations: { K: 'Diamond' } }, { ...input, formations: { K: 'Diamond' } })).toBe(false)
  })

  it('names the target in the labels: boss for the boss, else the node', () => {
    expect(targetLabels(undefined)).toEqual({
      reach: 'Reach boss',
      sunk: 'Boss sunk',
      whenReached: 'When the boss is reached',
      notSimulated: 'Not simulated (does not reach the boss)',
    })
    expect(targetLabels('E')).toEqual({
      reach: 'Reach E',
      sunk: 'E flagship sunk',
      whenReached: 'When E is reached',
      notSimulated: 'Not simulated (does not reach E)',
    })
  })

  it('treats a sortie moving on or ending as stale', () => {
    const atC = { ...input, sortie: { cells: [0, 3] } }
    expect(isStale(atC, { ...atC, sortie: { cells: [0, 3] } })).toBe(false)
    expect(isStale(atC, { ...atC, sortie: { cells: [0, 3, 5] } })).toBe(true)
    expect(isStale(atC, input)).toBe(true)
  })
})

describe('run state machine', () => {
  const snapshot: FleetSnapshot = { fleetId: 1, capturedAt: 0, hqLevel: 120, ships: [] }
  const input = { fleetId: 1, map: '2-5', choices: {}, trials: 2000, nightBattle: true, formations: {} }
  const routes = sortRoutes([
    { nodes: ['1', 'C', 'D'], probability: 0.3, reachesTarget: false, endsAtBoss: false },
    { nodes: ['1', 'O'], probability: 0.7, reachesTarget: true, endsAtBoss: true },
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
