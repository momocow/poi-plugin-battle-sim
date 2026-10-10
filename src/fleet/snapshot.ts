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
