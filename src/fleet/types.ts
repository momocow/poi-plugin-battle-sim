/**
 * The shapes read from poi's store, and the frozen fleet snapshot built from
 * them. Only the fields this plugin uses are declared.
 */

export interface ApiShip {
  api_id: number
  api_ship_id: number
  api_lv: number
  api_nowhp: number
  api_maxhp: number
  api_cond: number
  api_soku: number
  api_slot: number[]
  api_onslot: number[]
  /** Equipment roster id; -1 = opened but empty, 0 = not opened. */
  api_slot_ex: number
  /** Modernization: firepower, torpedo, anti-air, armor, luck, HP, ASW. */
  api_kyouka: number[]
  api_sakuteki: number[]
  api_lucky: number[]
}

export interface ApiEquip {
  api_id: number
  api_slotitem_id: number
  api_level?: number
  api_alv?: number
}

export interface ApiFleet {
  api_id: number
  api_name: string
  api_ship: number[]
}

export interface MstShip {
  api_id: number
  api_name: string
  api_stype: number
  [key: string]: unknown
}

export interface MstEquip {
  api_id: number
  api_name: string
  /** `[3]` is the icon id, `[2]` the category poi's helpers switch on. */
  api_type: number[]
  [key: string]: unknown
}

export interface MstShipType {
  api_id: number
  api_name: string
}

export interface MstMap {
  api_id: number
  api_maparea_id: number
  api_no: number
  api_name: string
}

export interface MstMaparea {
  api_id: number
  api_name: string
}

export interface PoiState {
  info?: {
    basic?: { api_level?: number }
    fleets?: ApiFleet[]
    ships?: Record<string, ApiShip>
    equips?: Record<string, ApiEquip>
  }
  const?: {
    $ships?: Record<string, MstShip>
    $equips?: Record<string, MstEquip>
    $shipTypes?: Record<string, MstShipType>
    $maps?: Record<string, MstMap>
    $mapareas?: Record<string, MstMaparea>
  }
  sortie?: { combinedFlag?: number }
}

export interface EquipSnapshot {
  equipId: number
  improvement: number
  proficiency: number
  /** Aircraft on board, for fighter power; 0 for the expansion slot. */
  onslot: number
}

export interface ShipSnapshot {
  shipId: number
  level: number
  /** Firepower, torpedo, anti-air, armor, luck, HP, ASW. */
  modernization: number[]
  hp: number
  maxHp: number
  morale: number
  /** Current LoS including equipment, as poi's Formula 33 helper expects. */
  los: number
  speed: number
  luck: number
  /** Main-slot equipment in slot order, empty slots left out. */
  slots: EquipSnapshot[]
  exSlot?: EquipSnapshot
}

export interface FleetSnapshot {
  fleetId: number
  capturedAt: number
  hqLevel: number
  ships: ShipSnapshot[]
}
