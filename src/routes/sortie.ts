/**
 * The selected fleet's sortie in progress, from poi's store, and what it rules
 * out: the predicted routes that don't start with the nodes visited so far.
 *
 * poi records the visited cells as numbers; the optimizer's kcnav topology
 * (`<kcnavDir>/<map>/_map.json`, `route: { "<cell>": [from, to, …] }`) turns
 * each into the letter of the node it enters. The store always shows the fleet
 * at a node whose battle is still ahead, so the last letter is the first node
 * left to fight. A branch the player chooses that the fleet has already passed
 * is decided: the letter after it is the branch taken.
 */
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { SimError } from '../errors'
import type { PoiState } from '../fleet/types'
import { choicesFor, type ChoiceValues } from './choices'
import type { RouteCandidate } from './predict'

export interface Sortie {
  /** For example "2-5". */
  map: string
  /** The start cell, then each cell entered. */
  cells: number[]
}

/** The fleet's sortie while it is out on a normal map; undefined at home or when the store lacks it. */
export function sortieOf(state: Pick<PoiState, 'sortie'> | undefined, fleetId: number): Sortie | undefined {
  const sortie = state?.sortie
  if (sortie?.sortieStatus?.[fleetId - 1] !== true) return undefined
  const id = String(sortie.sortieMapId ?? '')
  const cells = sortie.spotHistory
  if (!/^[1-7]\d$/.test(id) || !Array.isArray(cells) || cells.length < 2) return undefined
  return { map: `${id[0]}-${id[1]}`, cells: [...cells] }
}

const topologyPath = (kcnavDir: string, map: string): string => join(kcnavDir, map, '_map.json')

const routeTable = (text: string): Record<string, unknown> =>
  (JSON.parse(text) as { route?: Record<string, unknown> }).route ?? {}

/** The cells' letters in a topology's route table; throws naming the first cell it lacks. */
function lettersIn(route: Record<string, unknown>, cells: number[]): string[] {
  return cells.map((cell) => {
    const edge = route[String(cell)]
    const letter = Array.isArray(edge) ? edge[1] : undefined
    if (typeof letter !== 'string' || letter === '') throw new Error(`cell ${cell} is not in the topology`)
    return letter
  })
}

/** The letters of the nodes the cells enter, from the map's kcnav topology. */
export async function cellLetters(kcnavDir: string, sortie: Sortie): Promise<string[]> {
  const path = topologyPath(kcnavDir, sortie.map)
  try {
    return lettersIn(routeTable(await readFile(path, 'utf8')), sortie.cells)
  } catch (err) {
    throw new SimError('SORTIE_MAP_UNREADABLE', `The map data for ${sortie.map} could not be read.`, [
      path,
      String((err as Error)?.message ?? err),
    ])
  }
}

/** Topologies read so far, by directory and map; a map's topology does not change. */
const topologies = new Map<string, Record<string, unknown>>()

/** The same letters, read synchronously for the panel's render; undefined until the topology is there. */
export function cellLettersNow(kcnavDir: string, sortie: Sortie): string[] | undefined {
  const path = topologyPath(kcnavDir, sortie.map)
  try {
    let route = topologies.get(path)
    if (!route) {
      route = routeTable(readFileSync(path, 'utf8'))
      topologies.set(path, route)
    }
    return lettersIn(route, sortie.cells)
  } catch {
    return undefined
  }
}

/** The player-chosen branches the fleet has passed, as the choice values they amount to. */
export function takenBranches(map: string, letters: string[]): ChoiceValues {
  const taken: ChoiceValues = {}
  for (const b of choicesFor(map).branches) {
    const i = letters.indexOf(b.node)
    const next = i >= 0 ? letters[i + 1] : undefined
    if (next !== undefined && b.targets.includes(next)) taken[b.node] = next
  }
  return taken
}

/** The candidates starting with `letters`, their probabilities scaled to add up to 1. */
export function narrowToPath(candidates: RouteCandidate[], letters: string[], map: string): RouteCandidate[] {
  const kept = candidates.filter((c) => letters.every((letter, i) => c.nodes[i] === letter))
  const total = kept.reduce((sum, c) => sum + c.probability, 0)
  if (kept.length === 0 || total <= 0) {
    throw new SimError('SORTIE_PATH_UNMATCHED', `No predicted route on ${map} passes ${letters.join('-')}.`, [
      ...candidates.map((c) => `${c.nodes.join('-')} (${c.probability})`),
    ])
  }
  return kept.map((c) => ({ ...c, probability: c.probability / total }))
}
