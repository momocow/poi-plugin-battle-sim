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

/** 小破 above 50% up to 75% of max HP, 中破 above 25% up to 50%, 大破 up to 25%. */
export type Damage = 'none' | 'minor' | 'moderate' | 'heavy'

export interface ShipView {
  name: string
  level: number
  typeName: string
  hp: number
  maxHp: number
  damage: Damage
  morale: number
  moraleBand: MoraleBand
  slots: SlotView[]
  exSlot?: SlotView
}

export type LosMultiplier = 1 | 3 | 4

export interface FleetViewModel {
  speed: string
  fighterPower: number
  los: { x1: number; x3: number; x4: number }
  /** The Formula 33 multiplier of the map the fleet is shown for. */
  losMultiplier: LosMultiplier
  /** Ships below full HP. */
  damagedCount: number
  ships: ShipView[]
}

/** Integer comparisons, so the 25/50/75% boundaries are exact. */
export function damageOf(hp: number, maxHp: number): Damage {
  if (hp * 4 <= maxHp) return 'heavy'
  if (hp * 2 <= maxHp) return 'moderate'
  if (hp * 4 <= maxHp * 3) return 'minor'
  return 'none'
}

/**
 * poi's morale bands (its `poi-ship-cond-<band>` classes colour the square):
 * 0–19, 20–29, 30–39, 40–48, 49, 50–52, 53+.
 */
export type MoraleBand = 0 | 20 | 30 | 40 | 49 | 50 | 53

export function moraleBand(morale: number): MoraleBand {
  if (morale > 52) return 53
  if (morale > 49) return 50
  if (morale === 49) return 49
  if (morale > 39) return 40
  if (morale > 29) return 30
  if (morale > 19) return 20
  return 0
}

/** Formula 33's node-branching multiplier for a map: ×3 on 6-2/6-3, ×4 on 3-5/6-1, ×1 elsewhere. */
export function losMultiplier(map: string): LosMultiplier {
  if (map === '6-2' || map === '6-3') return 3
  if (map === '3-5' || map === '6-1') return 4
  return 1
}

export function buildFleetViewModel(snapshot: FleetSnapshot, master: MasterData, map: string): FleetViewModel {
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
    losMultiplier: losMultiplier(map),
    damagedCount: snapshot.ships.filter((s) => s.hp < s.maxHp).length,
    ships: snapshot.ships.map((s) => {
      const $ship = $ships[String(s.shipId)]
      const type = $ship ? master.$shipTypes?.[String($ship.api_stype)] : undefined
      return {
        name: $ship ? gameName($ship.api_name) : `#${s.shipId}`,
        level: s.level,
        typeName: type ? gameName(type.api_name) : '',
        hp: s.hp,
        maxHp: s.maxHp,
        damage: damageOf(s.hp, s.maxHp),
        morale: s.morale,
        moraleBand: moraleBand(s.morale),
        slots: s.slots.map(slotView),
        ...(s.exSlot ? { exSlot: slotView(s.exSlot) } : {}),
      }
    }),
  }
}

/** The live view of a fleet; throws the same typed errors as a run would. */
export const liveFleetViewModel = (state: PoiState | undefined, fleetId: number, map: string): FleetViewModel =>
  buildFleetViewModel(snapshotFleet(state, fleetId), state?.const ?? {}, map)
