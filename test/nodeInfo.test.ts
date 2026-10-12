import { beforeAll, describe, expect, it } from 'vitest'

import { loadShipGateData, type ShipGateTable } from '../src/fleet/specialGates'
import type { FleetSnapshot } from '../src/fleet/types'
import type { NodeFormation } from '../src/routes/formation'
import { initialRunState, routeNodeInfo, runReducer } from '../src/ui/state'

let ships: ShipGateTable
beforeAll(async () => {
  ships = await loadShipGateData('fcd/optimizer')
})

// Only the ship ids matter here: 金剛改二丙, 比叡改二丙 and 睦月s.
const fleet = (shipIds: number[]) => ({ fleetId: 1, capturedAt: 0, hqLevel: 1, ships: shipIds.map((shipId) => ({ shipId })) }) as FleetSnapshot
const set = (formation: NodeFormation['formation'], reason: NodeFormation['reason'] = 'normal'): NodeFormation => ({
  formation,
  isDefault: false,
  defaultFormation: 'LineAhead',
  reason,
})

describe('routeNodeInfo', () => {
  const formations = { C: set('LineAhead'), E: set('Diamond'), O: set('Echelon') }
  const colors = new Map<string, number>()

  it('gives each battle node its formation and the special that can fire there', () => {
    const info = routeNodeInfo(
      { nodes: ['B', 'C', 'O'], formations, colors, nightBattles: { O: true }, snapshot: fleet([591, 592, 1, 1, 1]), fired: [] },
      ships,
    )
    expect(info).toEqual({
      C: { type: 'normal', formation: 'LineAhead', special: null },
      O: { type: 'normal', formation: 'Echelon', special: 104 },
    })
  })

  it('downgrades the formation for the ship count', () => {
    const info = routeNodeInfo({ nodes: ['E'], formations, colors, nightBattles: {}, snapshot: fleet([1, 1, 1, 1]), fired: [] }, ships)
    expect(info.E?.formation).toBe('DoubleLine')
  })

  it('types a node by its default formation reason, an air raid told apart by its colour', () => {
    const air = { R: set('Diamond', 'air'), A: set('Diamond', 'air'), S: set('LineAbreast', 'submarines') }
    const info = routeNodeInfo(
      { nodes: ['R', 'A', 'S'], formations: air, colors: new Map([['R', 10], ['A', 7]]), nightBattles: {}, snapshot: fleet([1]), fired: [] },
      ships,
    )
    expect([info.R?.type, info.A?.type, info.S?.type]).toEqual(['airRaid', 'air', 'submarines'])
  })

  it('counts the specials fired earlier in the sortie', () => {
    const info = routeNodeInfo(
      { nodes: ['O'], formations, colors, nightBattles: { O: true }, snapshot: fleet([591, 592, 1, 1, 1]), fired: [104, 104, 104] },
      ships,
    )
    expect(info.O?.special).toBeNull()
  })
})

describe('routeDone', () => {
  it('stores the node info with the diag', () => {
    const snapshot = fleet([])
    let s = runReducer(initialRunState, { type: 'start', input: { fleetId: 1, map: '5-2', choices: {}, trials: 1, formations: {}, nightBattles: {} }, snapshot })
    s = runReducer(s, { type: 'predicted', routes: [{ nodes: ['1', 'O'], probability: 1, reachesTarget: true, endsAtBoss: true }], devOptimizer: false })
    const diag = { ranks: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, ranks_marginal: { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }, reach_boss_rate: 1, boss_sunk_rate: 1, per_node_reach: [1], route: [{ node: 'O', battleIndex: 0 }] }
    const nodeInfo = { O: { type: 'normal' as const, formation: 'LineAhead' as const, special: null } }
    s = runReducer(s, { type: 'routeDone', index: 0, diag, nodeInfo })
    expect(s.routes?.[0]?.nodeInfo).toEqual(nodeInfo)
  })
})
