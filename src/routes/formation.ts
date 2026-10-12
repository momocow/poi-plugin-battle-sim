/**
 * The player's formation at each battle node of a map: the user's choice for
 * the node, else a default by the kind of battle there. The first rule that
 * applies wins:
 * 1. every enemy composition is a single fleet of submarines only → 単横陣;
 * 2. some composition has a submarine → 梯形陣;
 * 3. a night-battle node (colour 11) → 梯形陣;
 * 4. an air battle or air raid (colour 7 or 10) → 輪形陣;
 * 5. any other node → 単縦陣.
 *
 * The compositions come from the node's kcnav data, `<kcnavDir>/<map>/<letter>.json`, or
 * `<kcnavDir>/<map>/<variant>/<letter>.json` for an event map's variant (the
 * game-data package's snapshot, or the plugin's own fetch); without it, the submarine
 * rules don't apply. Submarines are the ship types 潜水艦 (13) and 潜水空母
 * (14) in poi's master data. The colours come from the topology's vote.
 *
 * Night battle is set per node too (`nodeNightBattle`): by default only at the
 * target, always at a night-battle node, never sent for an air raid.
 *
 * `allowedFormation` mirrors the optimizer's single-fleet downgrade, so the
 * panel can show what a fleet of a given size actually gets; the simulation
 * sends the chosen formation and lets the optimizer downgrade it.
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { MstShip } from '../fleet/types'
import { AIR_BATTLE_COLORS, AIR_RAID_COLOR, battleNodes, NIGHT_BATTLE_COLOR, nodeColors, type RouteTable } from './topology'

/** The optimizer's names for the single-fleet formations, in the game's order. */
export const FORMATIONS = ['LineAhead', 'DoubleLine', 'Diamond', 'Echelon', 'LineAbreast', 'Vanguard'] as const

export type Formation = (typeof FORMATIONS)[number]

export const isFormation = (value: unknown): value is Formation => (FORMATIONS as readonly unknown[]).includes(value)

/** Why a node has its default formation. */
export type FormationReason = 'submarines' | 'submarinesMixed' | 'night' | 'air' | 'normal'

export interface EnemyComposition {
  enemyIds: number[]
  /** Empty for a single fleet. */
  escortIds: number[]
}

export function defaultFormation(input: {
  /** The node's majority colour; undefined when no edge into it votes. */
  color: number | undefined
  /** Undefined when the node's enemy data is not cached. */
  enemies: EnemyComposition[] | undefined
  isSubmarine: (shipId: number) => boolean
}): { formation: Formation; reason: FormationReason } {
  const { color, enemies, isSubmarine } = input
  // As the optimizer's `is_all_submarine_node`: an escort, even of submarines, is not a submarine-only node.
  const subsOnly = (c: EnemyComposition) => c.escortIds.length === 0 && c.enemyIds.length > 0 && c.enemyIds.every(isSubmarine)
  const hasSub = (c: EnemyComposition) => [...c.enemyIds, ...c.escortIds].some(isSubmarine)
  if (enemies?.length && enemies.every(subsOnly)) return { formation: 'LineAbreast', reason: 'submarines' }
  if (enemies?.some(hasSub)) return { formation: 'Echelon', reason: 'submarinesMixed' }
  if (color === NIGHT_BATTLE_COLOR) return { formation: 'Echelon', reason: 'night' }
  if (color !== undefined && AIR_BATTLE_COLORS.includes(color)) return { formation: 'Diamond', reason: 'air' }
  return { formation: 'LineAhead', reason: 'normal' }
}

/** The formation a single fleet of `shipCount` ships gets for `formation`, as the optimizer downgrades it. */
export function allowedFormation(formation: Formation, shipCount: number): Formation {
  if (shipCount < 4) return 'LineAhead'
  if (formation === 'Diamond' && shipCount < 5) return 'DoubleLine'
  return formation
}

const SUBMARINE_STYPES = [13, 14]

/** Whether a ship id is a submarine, by its type in poi's master data; unknown ids are not. */
export const submarineCheck =
  ($ships: Record<string, MstShip> | undefined) =>
  (shipId: number): boolean =>
    SUBMARINE_STYPES.includes($ships?.[String(shipId)]?.api_stype ?? 0)

const ids = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []

/** Compositions read so far, by path, with the file's mtime: a fetch may rewrite the file. */
const enemyCache = new Map<string, { mtimeMs: number; compositions: EnemyComposition[] }>()

/** The node's enemy compositions from the kcnav cache; undefined when the file is missing or unreadable. */
export function nodeEnemies(kcnavDir: string, map: string, letter: string, variant?: string): EnemyComposition[] | undefined {
  const path = join(kcnavDir, map, ...(variant ? [variant] : []), `${letter}.json`)
  try {
    const { mtimeMs } = statSync(path)
    const cached = enemyCache.get(path)
    if (cached?.mtimeMs === mtimeMs) return cached.compositions
    const candidates = (JSON.parse(readFileSync(path, 'utf8')) as { candidates?: unknown }).candidates
    if (!Array.isArray(candidates)) return undefined
    const compositions = candidates.map((c: { enemy_ids?: unknown; ships_escort?: unknown }) => ({
      enemyIds: ids(c?.enemy_ids),
      escortIds: ids(c?.ships_escort),
    }))
    enemyCache.set(path, { mtimeMs, compositions })
    return compositions
  } catch {
    return undefined
  }
}

export interface NodeFormation {
  /** The user's formation, else the default. */
  formation: Formation
  isDefault: boolean
  defaultFormation: Formation
  reason: FormationReason
}

/** The formation of every battle node; nodes without a battle get none. */
export function nodeFormations(input: {
  battles: Set<string>
  colors: Map<string, number>
  enemiesOf: (letter: string) => EnemyComposition[] | undefined
  isSubmarine: (shipId: number) => boolean
  /** The user's formations for the map, by node letter. */
  user: Record<string, Formation>
}): Record<string, NodeFormation> {
  const out: Record<string, NodeFormation> = {}
  for (const letter of input.battles) {
    const { formation, reason } = defaultFormation({
      color: input.colors.get(letter),
      enemies: input.enemiesOf(letter),
      isSubmarine: input.isSubmarine,
    })
    const chosen = input.user[letter]
    out[letter] = { formation: chosen ?? formation, isDefault: chosen === undefined, defaultFormation: formation, reason }
  }
  return out
}

/** `nodeFormations` for a map from its cached topology and enemy data: what the panel shows and the runner sends. */
export const mapFormations = (input: {
  kcnavDir: string
  map: string
  /** An event map's kcnav variant. */
  variant?: string
  topology: RouteTable
  $ships: Record<string, MstShip> | undefined
  user: Record<string, Formation>
}): Record<string, NodeFormation> =>
  nodeFormations({
    battles: battleNodes(input.topology),
    colors: nodeColors(input.topology),
    enemiesOf: (letter) => nodeEnemies(input.kcnavDir, input.map, letter, input.variant),
    isSubmarine: submarineCheck(input.$ships),
    user: input.user,
  })

/**
 * A node's night battle setting when the user set one; with none, the fleet pursues night battle only
 * when the node is the target.
 */
export type NightBattle = 'always' | 'never'

export const isNightBattle = (value: unknown): value is NightBattle => value === 'always' || value === 'never'

/**
 * Whether the fleet pursues night battle at a node: true or false, or undefined when nothing is sent. A
 * night-battle node always has one; an air raid has no night phase, so the optimizer only warns about it.
 */
export function nodeNightBattle(input: {
  setting: NightBattle | undefined
  isTarget: boolean
  /** The node's majority colour; undefined when no edge into it votes. */
  color: number | undefined
}): boolean | undefined {
  if (input.color === AIR_RAID_COLOR) return undefined
  if (input.color === NIGHT_BATTLE_COLOR) return true
  return input.setting === undefined ? input.isTarget : input.setting === 'always'
}
