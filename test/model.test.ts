import { describe, expect, it } from 'vitest'

import { snapshotFleet } from '../src/fleet/snapshot'
import {
  buildFleetViewModel,
  damageOf,
  liveFleetViewModel,
  losMultiplier,
  moraleBand,
  resupplyCost,
} from '../src/fleet-view/model'
import { loadStore } from './helpers'

describe('fleet view model', () => {
  for (const fleetId of [1, 2, 3, 4]) {
    it(`gives the same result from the live store and from a snapshot (fleet ${fleetId})`, () => {
      const state = loadStore()
      const snapshot = structuredClone(snapshotFleet(state, fleetId))
      expect(buildFleetViewModel(snapshot, state.const!, '1-1')).toEqual(liveFleetViewModel(state, fleetId, '1-1'))
    })
  }

  it('keeps showing the snapshot after the store changes', () => {
    const state = loadStore()
    const snapshot = snapshotFleet(state, 1)
    const frozen = buildFleetViewModel(snapshot, state.const!, '1-1')
    state.info!.ships!['545']!.api_lv = 1
    state.info!.equips!['69610']!.api_level = 10
    expect(buildFleetViewModel(snapshot, state.const!, '1-1')).toEqual(frozen)
    expect(liveFleetViewModel(state, 1, '1-1')).not.toEqual(frozen)
  })

  it('shows names, levels, types, equipment and the expansion slot', () => {
    const state = loadStore()
    const model = liveFleetViewModel(state, 1, '1-1')
    const flagship = model.ships[0]!
    expect(flagship.name).toBe('鳳翔改二')
    expect(flagship.level).toBe(state.info!.ships!['545']!.api_lv)
    expect(flagship.typeName).toBe('軽空母')
    expect(flagship.slots).toHaveLength(4)
    expect(flagship.exSlot).toBeDefined()
    expect(flagship.slots[0]!.iconId).toBeGreaterThan(0)
    expect(model.speed).toBe('Slow')
    expect(model.los.x3).toBeGreaterThan(model.los.x1)
    expect(model.fighterPower).toBeGreaterThan(0)
  })

  it('marks damage at the 75/50/25% boundaries', () => {
    expect([damageOf(45, 45), damageOf(44, 45), damageOf(40, 40), damageOf(31, 40)]).toEqual(['none', 'none', 'none', 'none'])
    expect([damageOf(30, 40), damageOf(21, 40)]).toEqual(['minor', 'minor'])
    expect([damageOf(20, 40), damageOf(20, 45), damageOf(11, 40)]).toEqual(['moderate', 'moderate', 'moderate'])
    expect([damageOf(10, 40), damageOf(1, 40)]).toEqual(['heavy', 'heavy'])
  })

  it('colours fuel and ammo as poi does, by percent full', () => {
    const state = loadStore()
    const snapshot = snapshotFleet(state, 1)
    const at = (now: number, max: number) => {
      snapshot.ships[0] = { ...snapshot.ships[0]!, fuel: now, fuelMax: max }
      return buildFleetViewModel(snapshot, state.const!, '1-1').ships[0]!.fuel?.intent
    }
    expect([at(100, 100), at(99, 100), at(76, 100)]).toEqual(['green', 'yellow', 'yellow'])
    expect([at(75, 100), at(51, 100), at(10, 15)]).toEqual(['orange', 'orange', 'orange'])
    expect([at(50, 100), at(0, 100)]).toEqual(['red', 'red'])
  })

  it('gives the resupply cost as poi works it out', () => {
    expect(resupplyCost(10, 15, 50)).toBe(5)
    expect(resupplyCost(0, 15, 175)).toBe(12)
    expect(resupplyCost(14, 15, 175)).toBe(1)
    expect(resupplyCost(15, 15, 50)).toBe(0)
  })

  it('shows fuel and ammo from the snapshot, leaving out a bar whose maximum is unknown', () => {
    const state = loadStore()
    const snapshot = snapshotFleet(state, 1)
    snapshot.ships[0] = { ...snapshot.ships[0]!, level: 50, fuel: 10, fuelMax: 15, ammo: 20, ammoMax: 20 }
    snapshot.ships[1] = { ...snapshot.ships[1]!, fuelMax: undefined }
    const [first, second] = buildFleetViewModel(snapshot, state.const!, '1-1').ships
    expect(first!.fuel).toEqual({ now: 10, max: 15, intent: 'orange', cost: 5 })
    expect(first!.ammo).toEqual({ now: 20, max: 20, intent: 'green', cost: 0 })
    expect(second!.fuel).toBeUndefined()
    expect(second).not.toHaveProperty('fuel')
    expect(second!.ammo).toBeDefined()
  })

  it('counts every ship below full HP as damaged, marked or not', () => {
    const state = loadStore()
    const snapshot = snapshotFleet(state, 1)
    snapshot.ships[0] = { ...snapshot.ships[0]!, hp: 20, maxHp: 45 }
    snapshot.ships[1] = { ...snapshot.ships[1]!, hp: 44, maxHp: 45 }
    for (const ship of snapshot.ships.slice(2)) ship.hp = ship.maxHp
    const model = buildFleetViewModel(snapshot, state.const!, '1-1')
    expect(model.ships.slice(0, 2).map((s) => [`${s.hp}/${s.maxHp}`, s.damage])).toEqual([
      ['20/45', 'moderate'],
      ['44/45', 'none'],
    ])
    expect(model.damagedCount).toBe(2)
  })

  it('shows LoS at ×1 with no map selected', () => {
    expect(losMultiplier(undefined)).toBe(1)
    const state = loadStore()
    expect(buildFleetViewModel(snapshotFleet(state, 1), state.const!, undefined).losMultiplier).toBe(1)
  })

  it('applies the map’s LoS multiplier', () => {
    expect(['6-2', '6-3', '3-5', '6-1', '1-1', '7-5'].map(losMultiplier)).toEqual([3, 3, 4, 4, 1, 1])
    expect(liveFleetViewModel(loadStore(), 1, '6-1').losMultiplier).toBe(4)
  })

  it('bands morale as poi does', () => {
    expect([0, 19, 20, 29, 30, 39, 40, 48, 49, 50, 52, 53, 100].map(moraleBand)).toEqual([
      0, 0, 20, 20, 30, 30, 40, 40, 49, 50, 50, 53, 53,
    ])
  })
})
