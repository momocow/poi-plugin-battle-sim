import { describe, expect, it } from 'vitest'

import { snapshotFleet } from '../src/fleet/snapshot'
import { buildFleetViewModel, liveFleetViewModel } from '../src/fleet-view/model'
import { loadStore } from './helpers'

describe('fleet view model', () => {
  for (const fleetId of [1, 2, 3, 4]) {
    it(`gives the same result from the live store and from a snapshot (fleet ${fleetId})`, () => {
      const state = loadStore()
      const snapshot = structuredClone(snapshotFleet(state, fleetId))
      expect(buildFleetViewModel(snapshot, state.const!)).toEqual(liveFleetViewModel(state, fleetId))
    })
  }

  it('keeps showing the snapshot after the store changes', () => {
    const state = loadStore()
    const snapshot = snapshotFleet(state, 1)
    const frozen = buildFleetViewModel(snapshot, state.const!)
    state.info!.ships!['545']!.api_lv = 1
    state.info!.equips!['69610']!.api_level = 10
    expect(buildFleetViewModel(snapshot, state.const!)).toEqual(frozen)
    expect(liveFleetViewModel(state, 1)).not.toEqual(frozen)
  })

  it('shows names, levels, types, equipment and the expansion slot', () => {
    const state = loadStore()
    const model = liveFleetViewModel(state, 1)
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
})
