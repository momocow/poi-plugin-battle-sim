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
  api_fuel: number
  api_bull: number
  api_soku: number
  api_slot: number[]
  api_onslot: number[]
  /** Main slots the ship has; `api_slot` is padded with -1 past it. */
  api_slotnum: number
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
  api_fuel_max?: number
  api_bull_max?: number
  /** Plane capacity per slot, padded to 5. */
  api_maxeq?: number[]
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
  sortie?: {
    combinedFlag?: number
    /** Per fleet, whether it is out; fleets 1 and 2 both for a combined fleet. */
    sortieStatus?: boolean[]
    /** Area and map number run together, for example "25" for 2-5. */
    sortieMapId?: number | string
    /** The start cell, then each cell entered, the current one last. */
    spotHistory?: number[]
  }
  /** The tab poi shows in its main area, and the plugin shown in the plugin pane. */
  ui?: { activeMainTab?: string; activePluginName?: string }
  /**
   * poi's config, mirrored into the store: `tabarea.double` is poi's double-tabbed layout, with plugins in
   * a pane of their own; `trials` and `rankDisplay` are this plugin's settings, unvalidated.
   */
  config?: {
    poi?: { tabarea?: { double?: boolean } }
    plugin?: { poi_battle_sim?: { trials?: unknown; rankDisplay?: unknown } }
  }
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
  fuel: number
  ammo: number
  /** Planes in each main slot the ship has, empty slots included; the expansion slot is not counted. */
  planes: number[]
  /** From the ship master data; undefined when it is missing there. */
  fuelMax?: number
  ammoMax?: number
  planesMax?: number[]
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
