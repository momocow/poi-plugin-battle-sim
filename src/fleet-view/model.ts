/**
 * The fleet display's view model, built one way for both sources.
 *
 * The live view snapshots the store and then goes through the same builder as
 * a frozen run snapshot, so the two can only differ by what was in the store.
 * Fleet speed, fighter power and LoS (Formula 33) come from poi's own helpers,
 * fed the same `[_ship, $ship]` / `[_equip, $equip, onslot]` tuples poi's
 * selectors produce; this is the only module that imports them.
 */
import { getFleetSpeed, getSaku33, getSpeedLabel, getTyku, type EquipData, type ShipData } from 'views/utils/game-utils'

import { gameName } from '../i18n'
import { translateIn } from '../poi'
import { snapshotFleet } from '../fleet/snapshot'
import type { EquipSnapshot, FleetSnapshot, MstEquip, MstShip, MstShipType, PoiState } from '../fleet/types'

export interface MasterData {
  $ships?: Record<string, MstShip>
  $equips?: Record<string, MstEquip>
  $shipTypes?: Record<string, MstShipType>
}

export interface SlotView {
  equipId: number
  name: string
  iconId: number
  /** ★N, shown when above 0. */
  improvement: number
  /** Proficiency marker, shown for 1–7. */
  proficiency: number
}

export interface ShipView {
  name: string
  level: number
  typeName: string
  slots: SlotView[]
  exSlot?: SlotView
}

export interface FleetViewModel {
  speed: string
  fighterPower: number
  los: { x1: number; x3: number; x4: number }
  ships: ShipView[]
}

export function buildFleetViewModel(snapshot: FleetSnapshot, master: MasterData): FleetViewModel {
  const $ships = master.$ships ?? {}
  const $equips = master.$equips ?? {}

  const equipTuple = (e: EquipSnapshot): EquipData => {
    const $equip = $equips[String(e.equipId)]
    return $equip ? [{ api_level: e.improvement, api_alv: e.proficiency }, $equip, e.onslot] : undefined
  }

  const shipsData: ShipData[] = snapshot.ships.map((s) => {
    const $ship = $ships[String(s.shipId)]
    return $ship ? [{ api_sakuteki: [s.los], api_soku: s.speed, api_lv: s.level }, $ship] : undefined
  })
  const equipsData: EquipData[][] = snapshot.ships.map((s) => [
    ...s.slots.map(equipTuple),
    ...(s.exSlot ? [equipTuple(s.exSlot)] : []),
  ])

  const saku = (k: number) => getSaku33(shipsData, equipsData, snapshot.hqLevel, k).total
  const slotView = (e: EquipSnapshot): SlotView => {
    const $equip = $equips[String(e.equipId)]
    return {
      equipId: e.equipId,
      name: $equip ? gameName($equip.api_name) : `#${e.equipId}`,
      iconId: $equip?.api_type[3] ?? 0,
      improvement: e.improvement,
      proficiency: e.proficiency,
    }
  }

  return {
    speed: translateIn('main', getSpeedLabel(getFleetSpeed(shipsData).speed)),
    fighterPower: getTyku(equipsData).max,
    los: { x1: saku(1), x3: saku(3), x4: saku(4) },
    ships: snapshot.ships.map((s) => {
      const $ship = $ships[String(s.shipId)]
      const type = $ship ? master.$shipTypes?.[String($ship.api_stype)] : undefined
      return {
        name: $ship ? gameName($ship.api_name) : `#${s.shipId}`,
        level: s.level,
        typeName: type ? gameName(type.api_name) : '',
        slots: s.slots.map(slotView),
        ...(s.exSlot ? { exSlot: slotView(s.exSlot) } : {}),
      }
    }),
  }
}

/** The live view of a fleet; throws the same typed errors as a run would. */
export const liveFleetViewModel = (state: PoiState | undefined, fleetId: number): FleetViewModel =>
  buildFleetViewModel(snapshotFleet(state, fleetId), state?.const ?? {})
