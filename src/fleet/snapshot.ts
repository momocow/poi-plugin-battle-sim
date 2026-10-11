/**
 * Read one fleet out of poi's store into a frozen snapshot.
 *
 * Every store read for fleet capture is here, so a poi version that renames a
 * field breaks one module. The snapshot is plain data: later store changes do
 * not reach a run that holds one.
 */
import { SimError } from '../errors'
import type { ApiEquip, EquipSnapshot, FleetSnapshot, PoiState, ShipSnapshot } from './types'

export function snapshotFleet(state: PoiState | undefined, fleetId: number, now = Date.now()): FleetSnapshot {
  const info = state?.info
  const hqLevel = info?.basic?.api_level
  const ships = info?.ships
  const equips = info?.equips
  if (!hqLevel || !info?.fleets?.length || !ships || !equips || !state?.const?.$ships) {
    throw new SimError('FLEET_NOT_LOADED', 'Game data is not loaded yet. Log in to the game first.')
  }

  const combinedFlag = state.sortie?.combinedFlag ?? 0
  if (combinedFlag > 0 && (fleetId === 1 || fleetId === 2)) {
    throw new SimError('FLEET_COMBINED', 'Combined fleets are not supported yet.', [
      `Fleets 1 and 2 are formed as a combined fleet (type ${combinedFlag}).`,
    ])
  }

  const fleet = info.fleets.find((f) => f.api_id === fleetId)
  const rosterIds = (fleet?.api_ship ?? []).filter((id) => id > 0)
  if (rosterIds.length === 0) {
    throw new SimError('FLEET_EMPTY', `Fleet ${fleetId} has no ships.`)
  }

  const missing = (what: string) =>
    new SimError('FLEET_NOT_LOADED', 'Game data is not loaded yet. Log in to the game first.', [what])

  const equipSnapshot = (rosterId: number, onslot: number): EquipSnapshot => {
    const equip: ApiEquip | undefined = equips[String(rosterId)]
    if (!equip) throw missing(`equipment ${rosterId} is not in the store`)
    return {
      equipId: equip.api_slotitem_id,
      improvement: equip.api_level ?? 0,
      proficiency: equip.api_alv ?? 0,
      onslot,
    }
  }

  const shipSnapshots = rosterIds.map((rosterId): ShipSnapshot => {
    const ship = ships[String(rosterId)]
    if (!ship) throw missing(`ship ${rosterId} is not in the store`)
    const slots = ship.api_slot.flatMap((equipId, i) =>
      equipId > 0 ? [equipSnapshot(equipId, ship.api_onslot[i] ?? 0)] : [],
    )
    return {
      shipId: ship.api_ship_id,
      level: ship.api_lv,
      modernization: [...ship.api_kyouka],
      hp: ship.api_nowhp,
      maxHp: ship.api_maxhp,
      morale: ship.api_cond,
      los: ship.api_sakuteki[0] ?? 0,
      speed: ship.api_soku,
      luck: ship.api_lucky[0] ?? 0,
      slots,
      ...(ship.api_slot_ex > 0 ? { exSlot: equipSnapshot(ship.api_slot_ex, 0) } : {}),
    }
  })

  return { fleetId, capturedAt: now, hqLevel, ships: shipSnapshots }
}

export interface Loadout {
  /** Equal for two states exactly when the same ships, at the same HP, carry the same equipment. */
  key: string
  /** At least one ship, and every ship's main slots all filled; the expansion slot is not counted. */
  complete: boolean
  /** Like `key` without HP: equal exactly when the same ships carry the same equipment. */
  setup: string
}

/**
 * The ships, their HP and equipment of the given fleets, enough to tell
 * whether they changed; undefined while the game data is not loaded. Levels,
 * morale and proficiency are left out, so those alone do not change it.
 */
export function fleetLoadout(state: PoiState | undefined, fleetIds: number[]): Loadout | undefined {
  const info = state?.info
  if (!info?.fleets?.length || !info.ships || !info.equips) return undefined
  const equipKey = (rosterId: number) =>
    rosterId > 0 ? `${rosterId}★${info.equips![String(rosterId)]?.api_level ?? 0}` : ''
  let count = 0
  let complete = true
  const hp: Record<number, number> = {}
  const parts = fleetIds.map((fleetId) => {
    const rosterIds = (info.fleets!.find((f) => f.api_id === fleetId)?.api_ship ?? []).filter((id) => id > 0)
    return rosterIds
      .map((rosterId) => {
        const ship = info.ships![String(rosterId)]
        count++
        if (!ship) {
          complete = false
          return `${rosterId}?`
        }
        hp[rosterId] = ship.api_nowhp
        const slots = ship.api_slot.slice(0, ship.api_slotnum)
        if (slots.length < ship.api_slotnum || slots.some((id) => id <= 0)) complete = false
        return `${rosterId}:${ship.api_ship_id}[${slots.map(equipKey).join(',')}+${equipKey(ship.api_slot_ex)}]`
      })
      .join(' ')
  })
  const setup = parts.join(' | ')
  return { key: `${setup} ♥${JSON.stringify(hp)}`, complete: complete && count > 0, setup }
}
