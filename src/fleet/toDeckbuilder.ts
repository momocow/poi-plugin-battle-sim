/**
 * Snapshot → a deck-builder v4 document, the fleet format compass reads.
 *
 * One fleet as `f1`; main-slot items as `i1…` in snapshot order and the
 * expansion slot as `ix`. Ships carry `id`, `lv` and current `luck`, the same
 * fields poi's fleet-export plugin writes.
 */
import type { EquipSnapshot, FleetSnapshot } from './types'

export interface DeckItem {
  id: number
  rf: number
  mas: number
}

export interface DeckShip {
  id: number
  lv: number
  luck: number
  items: Record<string, DeckItem>
}

export interface DeckBuilder {
  version: 4
  hqlv: number
  f1: Record<string, DeckShip>
}

const item = (e: EquipSnapshot): DeckItem => ({ id: e.equipId, rf: e.improvement, mas: e.proficiency })

export function toDeckbuilder(snapshot: FleetSnapshot): DeckBuilder {
  const f1: Record<string, DeckShip> = {}
  snapshot.ships.forEach((ship, i) => {
    const items: Record<string, DeckItem> = {}
    ship.slots.forEach((e, j) => (items[`i${j + 1}`] = item(e)))
    if (ship.exSlot) items.ix = item(ship.exSlot)
    f1[`s${i + 1}`] = { id: ship.shipId, lv: ship.level, luck: ship.luck, items }
  })
  return { version: 4, hqlv: snapshot.hqLevel, f1 }
}
