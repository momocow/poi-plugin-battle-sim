import { describe, expect, it } from 'vitest'

import { SimError } from '../src/errors'
import { fleetLoadout, snapshotFleet } from '../src/fleet/snapshot'
import { toDeckbuilder } from '../src/fleet/toDeckbuilder'
import { fleetShipsToml } from '../src/fleet/toToml'
import type { PoiState } from '../src/fleet/types'
import { loadStore } from './helpers'

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (err) {
    return (err as SimError).code
  }
  return undefined
}

/** Fleet 1's flagship (鳳翔改二) carries four items and an expansion-slot item. */
const withMiddleHole = (): PoiState => {
  const state = loadStore()
  const flagship = state.info!.ships!['545']!
  flagship.api_slot = [flagship.api_slot[0]!, -1, flagship.api_slot[2]!, -1, -1]
  return state
}

/** Parse the `[[fleet.ships]]` entries back into ids, enough to compare outputs. */
const parseToml = (toml: string) =>
  toml.split('[[fleet.ships]]').slice(1).map((block) => {
    const shipId = Number(/ship_id = (\d+)/.exec(block)![1])
    const tables = (text: string) =>
      [...text.matchAll(/equip_id = (\d+), stars = (\d+)/g)].map((m) => ({ id: Number(m[1]), rf: Number(m[2]) }))
    const equipment = tables(/equipment = \[(.*)\]/.exec(block)![1]!)
    const ex = /ex_slot = (.*)/.exec(block)
    return { shipId, equipment, ex: ex ? tables(ex[1]!)[0] : undefined }
  })

describe('snapshotFleet', () => {
  it('captures every ship in fleet order with its attributes', () => {
    const state = loadStore()
    const snap = snapshotFleet(state, 1, 1234)
    expect(snap.capturedAt).toBe(1234)
    expect(snap.hqLevel).toBe(120)
    expect(snap.ships).toHaveLength(6)
    const flagship = snap.ships[0]!
    const api = state.info!.ships!['545']!
    expect(flagship).toMatchObject({
      shipId: api.api_ship_id,
      level: api.api_lv,
      modernization: api.api_kyouka,
      hp: api.api_nowhp,
      morale: api.api_cond,
    })
    expect(flagship.slots).toHaveLength(4)
    expect(flagship.exSlot?.equipId).toBe(state.info!.equips!['69611']!.api_slotitem_id)
  })

  it('drops an empty middle slot, keeps order and the expansion-slot item', () => {
    const state = withMiddleHole()
    const api = state.info!.ships!['545']!
    const ids = (rosterId: number) => state.info!.equips![String(rosterId)]!.api_slotitem_id
    const flagship = snapshotFleet(state, 1).ships[0]!
    expect(flagship.slots.map((s) => s.equipId)).toEqual([ids(api.api_slot[0]!), ids(api.api_slot[2]!)])
    expect(flagship.slots.map((s) => s.onslot)).toEqual([api.api_onslot[0], api.api_onslot[2]])
    expect(flagship.exSlot?.equipId).toBe(ids(69611))
  })

  it('treats an opened-but-empty or unopened expansion slot as empty', () => {
    // Fleet 4: 伊58改 has an expansion-slot item, 春雨改二 an unopened slot (0), 玉波改 an empty one (-1).
    const ships = snapshotFleet(loadStore(), 4).ships
    expect(ships[0]!.exSlot).toBeDefined()
    expect(ships[1]!.exSlot).toBeUndefined()
    expect(ships[3]!.exSlot).toBeUndefined()
  })

  it('does not change when the store changes afterwards', () => {
    const state = loadStore()
    const snap = snapshotFleet(state, 1)
    const before = JSON.stringify(snap)
    state.info!.ships!['545']!.api_lv = 1
    state.info!.equips!['69610']!.api_level = 10
    expect(JSON.stringify(snap)).toBe(before)
  })

  it('rejects missing game data, an empty fleet, and a combined fleet', () => {
    expect(codeOf(() => snapshotFleet(undefined, 1))).toBe('FLEET_NOT_LOADED')
    expect(codeOf(() => snapshotFleet({ info: {}, const: {} }, 1))).toBe('FLEET_NOT_LOADED')

    const empty = loadStore()
    empty.info!.fleets![1]!.api_ship = [-1, -1, -1, -1, -1, -1]
    expect(codeOf(() => snapshotFleet(empty, 2))).toBe('FLEET_EMPTY')

    const combined = loadStore()
    combined.sortie = { combinedFlag: 1 }
    expect(codeOf(() => snapshotFleet(combined, 1))).toBe('FLEET_COMBINED')
    expect(codeOf(() => snapshotFleet(combined, 2))).toBe('FLEET_COMBINED')
    expect(codeOf(() => snapshotFleet(combined, 3))).toBeUndefined()
  })
})

describe('fleet outputs', () => {
  for (const fleetId of [1, 2, 3, 4]) {
    it(`TOML and deck-builder describe the same ships and equipment (fleet ${fleetId})`, () => {
      const snap = snapshotFleet(loadStore(), fleetId)
      const toml = parseToml(fleetShipsToml(snap))
      const deck = toDeckbuilder(snap)
      const deckShips = Object.values(deck.f1)
      expect(toml.map((s) => s.shipId)).toEqual(deckShips.map((s) => s.id))
      deckShips.forEach((ship, i) => {
        const { ix, ...main } = ship.items
        expect(toml[i]!.equipment).toEqual(Object.values(main).map(({ id, rf }) => ({ id, rf })))
        expect(toml[i]!.ex).toEqual(ix ? { id: ix.id, rf: ix.rf } : undefined)
      })
    })
  }

  it('writes the empty-middle-slot case as consecutive items plus ex_slot / ix', () => {
    const snap = snapshotFleet(withMiddleHole(), 1)
    const flagship = parseToml(fleetShipsToml(snap))[0]!
    expect(flagship.equipment).toHaveLength(2)
    expect(flagship.ex).toBeDefined()
    expect(Object.keys(toDeckbuilder(snap).f1.s1!.items)).toEqual(['i1', 'i2', 'ix'])
  })

  it('writes level, modernization, morale and proficiency, and hp_now only when damaged', () => {
    const state = loadStore()
    const snap = snapshotFleet(state, 1)
    snap.ships[1]!.hp = snap.ships[1]!.maxHp - 10
    const toml = fleetShipsToml(snap)
    const blocks = toml.split('[[fleet.ships]]').slice(1)
    expect(blocks[0]).toContain(`level = ${snap.ships[0]!.level}`)
    expect(blocks[0]).toContain(`modernization = [${snap.ships[0]!.modernization.join(', ')}]`)
    expect(blocks[0]).toContain(`morale = ${snap.ships[0]!.morale}`)
    expect(blocks[0]).toContain(`proficiency = ${snap.ships[0]!.slots[0]!.proficiency}`)
    expect(blocks[0]).not.toContain('hp_now')
    expect(blocks[1]).toContain(`hp_now = ${snap.ships[1]!.hp}`)
  })
})

describe('fleetLoadout', () => {
  it('is complete when every main slot is filled, ignoring the expansion slot', () => {
    const state = loadStore()
    // The fixture's last two ships have empty slots; 169 also fills a fifth slot.
    state.info!.fleets![0]!.api_ship = [545, 344, 132, 169, -1, -1]
    state.info!.ships!['545']!.api_slot_ex = -1
    expect(fleetLoadout(state, [1])?.complete).toBe(true)
    state.info!.ships!['169']!.api_slotnum = 4
    expect(fleetLoadout(state, [1])?.complete).toBe(true)
  })

  it('is incomplete with an empty main slot', () => {
    expect(fleetLoadout(withMiddleHole(), [1])?.complete).toBe(false)
  })

  it('counts only the ships present', () => {
    const state = loadStore()
    state.info!.fleets![0]!.api_ship = [545, -1, -1, -1, -1, -1]
    expect(fleetLoadout(state, [1])?.complete).toBe(true)
    state.info!.fleets![0]!.api_ship = [-1, -1, -1, -1, -1, -1]
    expect(fleetLoadout(state, [1])?.complete).toBe(false)
  })

  it('changes with equipment or ships, not with HP or morale', () => {
    const state = loadStore()
    const before = fleetLoadout(state, [1])!.key
    const flagship = state.info!.ships!['545']!
    flagship.api_nowhp -= 1
    flagship.api_cond = 10
    expect(fleetLoadout(state, [1])!.key).toBe(before)
    flagship.api_slot = [flagship.api_slot[1]!, flagship.api_slot[0]!, ...flagship.api_slot.slice(2)]
    expect(fleetLoadout(state, [1])!.key).not.toBe(before)
    state.info!.fleets![0]!.api_ship = [344, 545, 132, 169, 7455, 388]
    expect(fleetLoadout(state, [1])!.key).not.toBe(fleetLoadout(loadStore(), [1])!.key)
  })

  it('is undefined before the game data loads', () => {
    expect(fleetLoadout(undefined, [1])).toBeUndefined()
  })
})
