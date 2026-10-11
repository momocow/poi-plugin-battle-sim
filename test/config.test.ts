import { describe, expect, it } from 'vitest'

import { snapshotFleet } from '../src/fleet/snapshot'
import { simulateToml } from '../src/optimizer/config'
import { loadStore } from './helpers'

describe('simulateToml', () => {
  const input = { snapshot: snapshotFleet(loadStore(), 1), map: '2-5', nodes: ['G', 'L', 'O'], trials: 100 }

  it('writes special_attacks_fired under [fleet] when some fired', () => {
    expect(simulateToml({ ...input, specialAttacksFired: [100, 104] })).toMatch(
      /^\[fleet\]\nspecial_attacks_fired = \[100, 104\]\n\n\[\[fleet\.ships\]\]/,
    )
  })

  it('leaves it out when none fired', () => {
    expect(simulateToml(input)).not.toContain('special_attacks_fired')
    expect(simulateToml({ ...input, specialAttacksFired: [] })).not.toContain('special_attacks_fired')
  })
})
