import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { MstShip } from '../src/fleet/types'
import {
  allowedFormation,
  defaultFormation,
  isFormation,
  mapFormations,
  nodeEnemies,
  nodeFormations,
  submarineCheck,
  type EnemyComposition,
} from '../src/routes/formation'
import { nodeColors, topologyNow } from '../src/routes/topology'

const kcnavDir = join(__dirname, 'fixtures', 'kcnav')

/** The enemy ships in the fixtures, with their types from the optimizer's ship data; 1530 and 1532 are submarines. */
const STYPES: Record<number, number> = {
  1501: 2, 1513: 15, 1519: 3, 1526: 15, 1527: 5, 1528: 11, 1530: 13, 1532: 13,
  1542: 8, 1543: 8, 1554: 3, 1555: 3, 1575: 2, 1576: 2, 1579: 11, 1592: 3,
}
const $ships = Object.fromEntries(
  Object.entries(STYPES).map(([id, stype]) => [id, { api_id: Number(id), api_name: '', api_stype: stype } as MstShip]),
)
const isSubmarine = submarineCheck($ships)

const single = (...enemyIds: number[]): EnemyComposition => ({ enemyIds, escortIds: [] })
const rule = (color: number | undefined, enemies: EnemyComposition[] | undefined) =>
  defaultFormation({ color, enemies, isSubmarine })

describe('default formation', () => {
  it('takes 単横陣 when every composition is submarines only', () => {
    expect(rule(4, [single(1530), single(1530, 1532)])).toEqual({ formation: 'LineAbreast', reason: 'submarines' })
  })

  it('lets the submarine rules win over a night battle', () => {
    expect(rule(11, [single(1530, 1532)])).toEqual({ formation: 'LineAbreast', reason: 'submarines' })
    expect(rule(11, [single(1530, 1501)])).toEqual({ formation: 'Echelon', reason: 'submarinesMixed' })
  })

  it('does not count an enemy combined fleet as submarines only, even of submarines', () => {
    expect(rule(4, [{ enemyIds: [1530], escortIds: [1532] }])).toEqual({ formation: 'Echelon', reason: 'submarinesMixed' })
  })

  it('takes 梯形陣 when one composition has a submarine', () => {
    expect(rule(4, [single(1501, 1501), single(1530, 1501)])).toEqual({ formation: 'Echelon', reason: 'submarinesMixed' })
  })

  it('takes 梯形陣 at a night battle, 輪形陣 at an air battle or air raid, and 単縦陣 otherwise', () => {
    expect(rule(11, [single(1501)])).toEqual({ formation: 'Echelon', reason: 'night' })
    expect(rule(7, [single(1501)])).toEqual({ formation: 'Diamond', reason: 'air' })
    expect(rule(10, [single(1579)])).toEqual({ formation: 'Diamond', reason: 'air' })
    expect(rule(4, [single(1501)])).toEqual({ formation: 'LineAhead', reason: 'normal' })
    expect(rule(undefined, [])).toEqual({ formation: 'LineAhead', reason: 'normal' })
  })

  it('skips the submarine rules without enemy data', () => {
    expect(rule(4, undefined)).toEqual({ formation: 'LineAhead', reason: 'normal' })
    expect(rule(10, undefined)).toEqual({ formation: 'Diamond', reason: 'air' })
  })
})

describe('allowedFormation', () => {
  it('gives fewer than 4 ships 単縦陣, and 4 ships 複縦陣 for 輪形陣, as the optimizer does', () => {
    expect(allowedFormation('Echelon', 3)).toBe('LineAhead')
    expect(allowedFormation('Diamond', 4)).toBe('DoubleLine')
    expect(allowedFormation('Echelon', 4)).toBe('Echelon')
    expect(allowedFormation('Diamond', 5)).toBe('Diamond')
  })
})

describe('isFormation', () => {
  it('accepts the six single-fleet formations only', () => {
    expect(isFormation('Vanguard')).toBe(true)
    expect(isFormation('CF1')).toBe(false)
    expect(isFormation(1)).toBe(false)
  })
})

describe('node enemies', () => {
  it('reads the compositions of a cached node, and nothing for one not cached', () => {
    expect(nodeEnemies(kcnavDir, '1-5', 'A')?.[0]).toEqual({ enemyIds: [1532], escortIds: [] })
    expect(nodeEnemies(kcnavDir, '5-2', 'Z')).toBeUndefined()
  })
})

describe('node formations', () => {
  it("gives 5-2's air raid, submarine and normal nodes their defaults", () => {
    const formations = mapFormations({ kcnavDir, map: '5-2', topology: topologyNow(kcnavDir, '5-2')!, $ships, user: {} })
    expect(formations.C).toMatchObject({ formation: 'Diamond', reason: 'air', isDefault: true })
    expect(formations.I).toMatchObject({ formation: 'Diamond', reason: 'air' })
    expect(formations.D).toMatchObject({ formation: 'Echelon', reason: 'submarinesMixed' })
    expect(formations.E).toMatchObject({ formation: 'LineAhead', reason: 'normal' })
    // A maelstrom and a pass-through node have no battle, so no formation.
    expect(formations.A).toBeUndefined()
    expect(formations.B).toBeUndefined()
    // The boss is the topology's colour 5, which the popup marks.
    expect(nodeColors(topologyNow(kcnavDir, '5-2')!).get('O')).toBe(5)
  })

  it("gives 1-5's submarine node 単横陣", () => {
    const formations = mapFormations({ kcnavDir, map: '1-5', topology: topologyNow(kcnavDir, '1-5')!, $ships, user: {} })
    expect(formations.A).toMatchObject({ formation: 'LineAbreast', reason: 'submarines' })
  })

  it("puts the user's formation over the default, keeping the default to show", () => {
    const topology = topologyNow(kcnavDir, '5-2')!
    const formations = nodeFormations({
      battles: new Set(['C', 'E']),
      colors: nodeColors(topology),
      enemiesOf: () => undefined,
      isSubmarine,
      user: { C: 'LineAhead' },
    })
    expect(formations.C).toEqual({ formation: 'LineAhead', isDefault: false, defaultFormation: 'Diamond', reason: 'air' })
    expect(formations.E).toEqual({ formation: 'LineAhead', isDefault: true, defaultFormation: 'LineAhead', reason: 'normal' })
  })
})
