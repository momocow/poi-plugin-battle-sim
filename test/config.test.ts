import { describe, expect, it } from 'vitest'

import { snapshotFleet } from '../src/fleet/snapshot'
import { simulateToml } from '../src/optimizer/config'
import { loadStore } from './helpers'

describe('simulateToml', () => {
  const input = {
    snapshot: snapshotFleet(loadStore(), 1),
    map: '2-5',
    nodes: ['G', 'L', 'O'],
    trials: 100,
    nightBattle: true,
    perNode: false,
  }

  it('writes special_attacks_fired under [fleet] when some fired', () => {
    expect(simulateToml({ ...input, specialAttacksFired: [100, 104] })).toMatch(
      /^\[fleet\]\nspecial_attacks_fired = \[100, 104\]\n\n\[\[fleet\.ships\]\]/,
    )
  })

  it('pursues night battle at the boss and asks for the ranks channel only, as before targets', () => {
    expect(simulateToml(input)).toContain(
      '[tactics.nodes.O]\ndo_night_battle = true\n\n[run]\ntrials = 100\n\n[output]\nfields = ["ranks"]\n',
    )
  })

  it('writes night battle off at the last node', () => {
    expect(simulateToml({ ...input, nightBattle: false })).toContain('[tactics.nodes.O]\ndo_night_battle = false\n')
  })

  it('asks for the per-node channels for a node target, which is the last node', () => {
    const toml = simulateToml({ ...input, nodes: ['G', 'L'], perNode: true })
    expect(toml).toContain('[tactics.nodes.L]\ndo_night_battle = true\n')
    expect(toml).toContain('fields = ["ranks", "ranks-per-node", "node-outcomes"]\n')
  })

  it('leaves it out when none fired', () => {
    expect(simulateToml(input)).not.toContain('special_attacks_fired')
    expect(simulateToml({ ...input, specialAttacksFired: [] })).not.toContain('special_attacks_fired')
  })
})
