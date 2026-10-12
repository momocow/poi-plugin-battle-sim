/**
 * Which special attack (旗艦特攻) a single fleet can fire at a node, for the
 * route cards' node tooltips. Nothing here is sent to the optimizer.
 *
 * A copy of the optimizer's static gates, as documented in
 * `kancolle-fleet-optimizer/src/simulator/special_attack_fleet.md` and coded
 * in `special_attack_fleet.rs` (`try_special_attack` and the `check_*_gates`
 * it dispatches to); the id lists below name the constant each comes from.
 * HP gates are left out, as they change during a sortie, and so is a special
 * fired at an earlier node of the same route: the answer is "can fire", not
 * "will fire". The sortie lock follows `special_attacks_fired`: any special
 * fired locks every kind but the 金剛型 night attack (104), which fires up to
 * three times. A shelling carrier is told apart by its ship type alone; the
 * optimizer also counts a ship that can air attack with a carrier plane.
 *
 * Each ship's special kind and type come from the optimizer's bundled
 * `ships.json`, read once; poi's master data has no special kind.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { devLog } from '../devlog'
import type { Formation } from '../routes/formation'

export const SPECIAL_ATTACKS = [100, 101, 102, 103, 104, 105, 106, 400, 401] as const
export type SpecialAttack = (typeof SPECIAL_ATTACKS)[number]

export interface ShipGateData {
  /** `attack_special`; undefined when the ship has none. */
  attackSpecial?: number
  /** `ship_type`, such as "BB" or "SS". */
  type: string
}

export type ShipGateTable = Map<number, ShipGateData>

const tables = new Map<string, Promise<ShipGateTable>>()

/** The ship data the gates need, by ship id; empty when `ships.json` can't be read, so no special can fire. */
export function loadShipGateData(dataDir: string): Promise<ShipGateTable> {
  let table = tables.get(dataDir)
  if (!table) {
    const path = join(dataDir, 'ships.json')
    table = readFile(path, 'utf8').then(
      (text) => {
        const out: ShipGateTable = new Map()
        for (const ship of JSON.parse(text) as Record<string, unknown>[]) {
          if (typeof ship.id !== 'number') continue
          out.set(ship.id, {
            attackSpecial: typeof ship.attack_special === 'number' ? ship.attack_special : undefined,
            type: String(ship.ship_type),
          })
        }
        return out
      },
      (err) => {
        devLog('specials.shipDataFailed', { path, error: String(err) })
        return new Map()
      },
    )
    tables.set(dataDir, table)
  }
  return table
}

// Trigger formations: `NELSON_FORMATIONS` … `YAMATO_FORMATIONS`, single-fleet ones only.
const FORMATIONS: Record<SpecialAttack, Formation[]> = {
  100: ['DoubleLine'],
  101: ['Echelon'],
  102: ['Echelon'],
  103: ['Echelon'],
  104: ['LineAhead', 'Echelon'],
  105: ['DoubleLine'],
  106: ['Echelon'],
  400: ['Echelon'],
  401: ['Echelon'],
}

const BATTLESHIPS = ['BB', 'FBB', 'BBV']
const CARRIERS = ['CV', 'CVL', 'CVB']
const SUBMARINES = ['SS', 'SSV']
/** `RICHELIEU_PARTNER_MIDS`, `WARSPITE_PARTNER_MIDS`. */
const RICHELIEU_PARTNERS = [392, 724, 969]
const WARSPITE_PARTNERS = [364, 733]
/** `kongou_partner_for`. */
const KONGOU_PARTNERS: Record<number, number[]> = {
  591: [592, 151, 593, 954, 694, 439, 364, 927, 733],
  592: [591, 152, 694, 593, 954],
  593: [591, 592, 694],
  954: [591, 592, 694],
  694: [591, 592, 593, 954, 697],
}
/** `YAMATO_3SHIP_FLAGSHIP_MIDS`, `YAMATO_2SHIP_FLAGSHIP_MIDS`. */
const YAMATO_3SHIP_FLAGSHIPS = [911, 916]
const YAMATO_2SHIP_FLAGSHIPS = [546, 911, 916]
/** `YAMATO_3SHIP_PAIRS`, either way round. */
const YAMATO_3SHIP_PAIRS: [number, number][] = [
  [541, 573], [553, 554], [411, 412],
  [364, 576], [364, 733], [576, 577],
  [591, 592], [591, 593], [591, 954], [591, 694], [592, 694],
  [697, 659], [1496, 918], [446, 447],
  [392, 724], [969, 724],
]
/** `YAMATO_2SHIP_PARTNERS_YAMATO_FLAG`, `YAMATO_2SHIP_PARTNERS_MUSASHI_FLAG`. */
const YAMATO_2SHIP_PARTNERS_YAMATO = [546, 178, 360, 392, 969, 724]
const YAMATO_2SHIP_PARTNERS_MUSASHI = [911, 916]

export function possibleSpecial(
  input: {
    /** Ship ids in fleet order, flagship first. */
    shipIds: number[]
    /** The formation fought in, after the ship-count rule. */
    formation: Formation
    /** Whether the node has a night battle. */
    night: boolean
    /** Special-attack ids fired earlier in the sortie, one per firing. */
    fired: number[]
  },
  ships: ShipGateTable,
): SpecialAttack | null {
  const { shipIds, formation, night, fired } = input
  const types = shipIds.map((id) => ships.get(id)?.type)
  const surface = types.filter((t) => t !== undefined && !SUBMARINES.includes(t)).length
  const flagship = shipIds[0]
  if (flagship === undefined) return null
  const locked = fired.length > 0
  const isBattleship = (i: number) => BATTLESHIPS.includes(types[i] ?? '')
  const passes = (kind: SpecialAttack, partners: boolean): boolean =>
    partners && FORMATIONS[kind].includes(formation) && surface >= (kind === 104 ? 5 : 6) &&
    (kind === 104 ? night && fired.filter((f) => f === 104).length < 3 : !locked)

  const kind = ships.get(flagship)?.attackSpecial
  switch (kind) {
    case 100: {
      // Positions 3 and 5 neither submarines nor shelling carriers.
      const ok = [2, 4].every((i) => types[i] !== undefined && ![...SUBMARINES, ...CARRIERS].includes(types[i]!))
      return passes(100, ok) ? 100 : null
    }
    case 101:
    case 102:
      return passes(kind, isBattleship(1)) ? kind : null
    case 103:
      return passes(103, isBattleship(1) && isBattleship(2)) ? 103 : null
    case 104:
      return passes(104, KONGOU_PARTNERS[flagship]?.includes(shipIds[1]!) ?? false) ? 104 : null
    case 105:
      return passes(105, RICHELIEU_PARTNERS.includes(shipIds[1]!)) ? 105 : null
    case 106:
      return passes(106, WARSPITE_PARTNERS.includes(shipIds[1]!)) ? 106 : null
  }
  // Yamato goes by flagship id, not `attack_special`; 400 is tried first.
  const [, second, third] = shipIds
  const pair = YAMATO_3SHIP_PAIRS.some(([a, b]) => (second === a && third === b) || (second === b && third === a))
  if (YAMATO_3SHIP_FLAGSHIPS.includes(flagship) && passes(400, pair || (second === 546 && (third === 541 || third === 573)))) {
    return 400
  }
  if (YAMATO_2SHIP_FLAGSHIPS.includes(flagship)) {
    const partners = flagship === 546 ? YAMATO_2SHIP_PARTNERS_MUSASHI : YAMATO_2SHIP_PARTNERS_YAMATO
    if (passes(401, partners.includes(second!))) return 401
  }
  return null
}
