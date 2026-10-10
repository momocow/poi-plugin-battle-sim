/**
 * Snapshot → the optimizer's inline `[[fleet.ships]]` entries.
 *
 * `equipment` is the main slots in order with empty slots already dropped by
 * the snapshot; the optimizer rejects placeholders and places `ex_slot` itself.
 * `hp_now` is written only for a damaged ship (omitted means full HP).
 */
import type { EquipSnapshot, FleetSnapshot } from './types'

const equipToml = (e: EquipSnapshot): string =>
  `{ equip_id = ${e.equipId}, stars = ${e.improvement}, proficiency = ${e.proficiency} }`

export function fleetShipsToml(snapshot: FleetSnapshot): string {
  return snapshot.ships
    .map((ship) => {
      const lines = [
        '[[fleet.ships]]',
        `ship_id = ${ship.shipId}`,
        `level = ${ship.level}`,
        `modernization = [${ship.modernization.join(', ')}]`,
        `morale = ${ship.morale}`,
      ]
      if (ship.hp < ship.maxHp) lines.push(`hp_now = ${ship.hp}`)
      lines.push(`equipment = [${ship.slots.map(equipToml).join(', ')}]`)
      if (ship.exSlot) lines.push(`ex_slot = ${equipToml(ship.exSlot)}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
