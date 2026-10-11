import { afterEach, describe, expect, it } from 'vitest'

import { fleetLoadout } from '../src/fleet/snapshot'
import type { PoiState } from '../src/fleet/types'
import { selectedFleetChanged, setShownFleet } from '../src/ui/focus'
import { loadStore } from './helpers'

/** Record fleet 1 as the panel shows it in `state`. */
const show = (state: PoiState) => {
  const loadout = fleetLoadout(state, [1])!
  setShownFleet({ fleetIds: [1], setup: loadout.setup })
}

const swapFirstTwoSlots = (state: PoiState, rosterId: string) => {
  const ship = state.info!.ships![rosterId]!
  ship.api_slot = [ship.api_slot[1]!, ship.api_slot[0]!, ...ship.api_slot.slice(2)]
}

describe('selectedFleetChanged', () => {
  afterEach(() => setShownFleet(undefined))

  it('is false when nothing changed', () => {
    const state = loadStore()
    show(state)
    expect(selectedFleetChanged(state)).toBe(false)
  })

  it('is true when equipment on the selected fleet changed', () => {
    const state = loadStore()
    show(state)
    swapFirstTwoSlots(state, '545')
    expect(selectedFleetChanged(state)).toBe(true)
  })

  it('is false when only another fleet changed', () => {
    const state = loadStore()
    show(state)
    swapFirstTwoSlots(state, '640')
    state.info!.ships!['640']!.api_nowhp += 1
    expect(selectedFleetChanged(state)).toBe(false)
  })

  it('is true when a ship moved into the selected fleet', () => {
    const state = loadStore()
    show(state)
    state.info!.fleets![0]!.api_ship = [545, 344, 132, 169, 7455, 640]
    expect(selectedFleetChanged(state)).toBe(true)
  })

  it('is false when HP rose or fell on the selected fleet', () => {
    const state = loadStore()
    state.info!.ships!['545']!.api_nowhp -= 5
    show(state)
    state.info!.ships!['545']!.api_nowhp += 5
    expect(selectedFleetChanged(state)).toBe(false)
    state.info!.ships!['545']!.api_nowhp -= 10
    expect(selectedFleetChanged(state)).toBe(false)
  })

  it('is false with nothing shown or no game data', () => {
    expect(selectedFleetChanged(loadStore())).toBe(false)
    show(loadStore())
    expect(selectedFleetChanged(undefined)).toBe(false)
  })
})
