/**
 * Snapshot → the optimizer's inline `[[fleet.ships]]` entries.
 *
 * `equipment` is the main slots in order with empty slots already dropped by
 * the snapshot; the optimizer rejects placeholders and places `ex_slot` itself.
 * `hp_now` is written only for a damaged ship (omitted means full HP), and
 * `fuel_now`, `ammo_now` and `slots_now` only when below full, capped at the
 * master data's maximum (the optimizer rejects anything above it) and left out
 * when that maximum is unknown.
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
      if (ship.fuelMax !== undefined && ship.fuel < ship.fuelMax) lines.push(`fuel_now = ${Math.max(0, ship.fuel)}`)
      if (ship.ammoMax !== undefined && ship.ammo < ship.ammoMax) lines.push(`ammo_now = ${Math.max(0, ship.ammo)}`)
      const planesMax = ship.planesMax
      if (planesMax?.length === ship.planes.length && ship.planes.some((n, i) => n < planesMax[i]!)) {
        const planes = ship.planes.map((n, i) => Math.min(Math.max(0, n), planesMax[i]!))
        lines.push(`slots_now = [${planes.join(', ')}]`)
      }
      lines.push(`equipment = [${ship.slots.map(equipToml).join(', ')}]`)
      if (ship.exSlot) lines.push(`ex_slot = ${equipToml(ship.exSlot)}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
