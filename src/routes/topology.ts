/**
 * A map's kcnav topology, `<kcnavDir>/<map>/_map.json`, which the map's shared
 * enemy-data fetch writes: `route: { "<cell>": [from, to, colorNo, eventId] }`.
 * It turns poi's cell numbers into node letters, and tells which nodes have a
 * battle before any run.
 *
 * The battle rule copies the optimizer's (`src/data/kcnav/response.rs`,
 * `maelstrom_nodes` / `pass_through_nodes`): a node is a maelstrom when an edge
 * into it has `eventId` 3, and a pass-through node (resources, empty, active
 * branch …) when every edge into it has an `eventId` in 1, 2, 6, 8 or 9,
 * ignoring kcnav's negative "unknown" ids. Every other node has a battle; air
 * raids share `eventId` 4 with normal battles. The optimizer rejects tactics on
 * a node without a battle, so the plugin must not send one as a target.
 *
 * Node kinds copy its colour vote (`node_colors`): the majority `colorNo`
 * over the edges into the node, spawn edges and invalid values not counted,
 * ties to the smaller code. 11 means the battle there is a night battle only,
 * so `do_night_battle` has no effect; 7 is an air battle, 10 an air raid and 5 a boss.
 */
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type RouteTable = Record<string, unknown>

export const topologyPath = (kcnavDir: string, map: string): string => join(kcnavDir, map, '_map.json')

const routeTable = (text: string): RouteTable => (JSON.parse(text) as { route?: RouteTable }).route ?? {}

/** The map's route table; throws when the file is missing or unreadable. */
export async function readTopology(kcnavDir: string, map: string): Promise<RouteTable> {
  return routeTable(await readFile(topologyPath(kcnavDir, map), 'utf8'))
}

/** Topologies read so far, by path; a map's topology does not change. A missing file is not remembered. */
const topologies = new Map<string, RouteTable>()

/** The same table, read synchronously for the panel's render; undefined until the file is there. */
export function topologyNow(kcnavDir: string, map: string): RouteTable | undefined {
  const path = topologyPath(kcnavDir, map)
  try {
    let route = topologies.get(path)
    if (!route) {
      route = routeTable(readFileSync(path, 'utf8'))
      topologies.set(path, route)
    }
    return route
  } catch {
    return undefined
  }
}

const MAELSTROM_EVENT_ID = 3
const PASS_THROUGH_EVENT_IDS = [1, 2, 6, 8, 9]

/** The letters of the nodes with a battle; the start node, which no edge enters from a node, is left out. */
export function battleNodes(route: RouteTable): Set<string> {
  const nodes = new Set<string>()
  const maelstrom = new Set<string>()
  /** Per node, whether every counted edge into it is a pass-through event. */
  const pass = new Map<string, boolean>()
  for (const edge of Object.values(route)) {
    if (!Array.isArray(edge)) continue
    const [from, to, , eventId] = edge as unknown[]
    if (typeof to !== 'string' || from === null) continue
    nodes.add(to)
    if (typeof eventId !== 'number' || eventId < 0) continue
    if (eventId === MAELSTROM_EVENT_ID) maelstrom.add(to)
    pass.set(to, (pass.get(to) ?? true) && PASS_THROUGH_EVENT_IDS.includes(eventId))
  }
  return new Set([...nodes].filter((letter) => !maelstrom.has(letter) && pass.get(letter) !== true))
}

export const BOSS_COLOR = 5
export const NIGHT_BATTLE_COLOR = 11
/** 航空戦 and 空襲戦 (air raid). */
export const AIR_BATTLE_COLORS = [7, 10]

/** Per node, the majority colour of the edges into it, as the optimizer votes (`node_colors`). */
export function nodeColors(route: RouteTable): Map<string, number> {
  const votes = new Map<string, number[]>()
  for (const edge of Object.values(route)) {
    if (!Array.isArray(edge)) continue
    const [from, to, color] = edge as unknown[]
    if (from === null || typeof to !== 'string' || to === '') continue
    if (typeof color !== 'number' || !Number.isInteger(color) || color < 0 || color > 255) continue
    votes.set(to, [...(votes.get(to) ?? []), color])
  }
  const majority = (colors: number[]): number => {
    const tally = new Map<number, number>()
    for (const c of colors) tally.set(c, (tally.get(c) ?? 0) + 1)
    return [...tally].sort(([a, na], [b, nb]) => nb - na || a - b)[0]![0]
  }
  return new Map([...votes].map(([letter, colors]) => [letter, majority(colors)]))
}

/** The letters of the night-battle nodes, where the battle is a night battle whatever `do_night_battle` says. */
export function nightOnlyNodes(route: RouteTable): Set<string> {
  return new Set([...nodeColors(route)].filter(([, color]) => color === NIGHT_BATTLE_COLOR).map(([letter]) => letter))
}
