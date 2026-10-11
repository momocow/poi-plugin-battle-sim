/**
 * Which candidates reach the target, from the optimizer's bundled `maps.json`
 * (`{"5-2": {"boss_letters": ["O"]}, …}`). No network access.
 *
 * The target is Boss (undefined) or a node letter. With Boss, a candidate
 * reaches it when its last node is one of the map's boss letters, and keeps
 * all its nodes. With a node, a candidate reaches it when the letter occurs
 * after the start node, and is cut right after its first occurrence;
 * candidates that are the same after the cut merge, their probabilities
 * summed. Candidates that miss the target keep all their nodes. Mid-sortie,
 * narrowing comes first, as a cut route may no longer hold all the visited
 * letters; a target before index `from` (the node the fleet is at) has been
 * passed: its battle is over, so the row is marked `passedTarget`.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { SimError } from '../errors'

export type BossLetters = Record<string, string[]>

export async function loadBossLetters(dataDir: string): Promise<BossLetters> {
  const path = join(dataDir, 'maps.json')
  let maps: Record<string, { boss_letters?: unknown }>
  try {
    maps = JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    throw new SimError('BINARY_MISSING', "The optimizer's bundled map data could not be read.", [path, String(err)])
  }
  return Object.fromEntries(
    Object.entries(maps).map(([map, entry]) => [
      map,
      Array.isArray(entry.boss_letters) ? entry.boss_letters.map(String) : [],
    ]),
  )
}

export function bossLettersFor(bosses: BossLetters, map: string): string[] {
  const letters = bosses[map]
  if (!letters || letters.length === 0) {
    throw new SimError('BINARY_MISSING', `The optimizer's bundled map data has no boss for ${map}.`)
  }
  return letters
}

export const endsAtBoss = (nodes: string[], bossLetters: string[]): boolean => {
  const last = nodes[nodes.length - 1]
  return last !== undefined && bossLetters.includes(last)
}

/** The candidates for `target` (undefined = Boss), each marked `reachesTarget`; see the header. */
export function applyTarget<T extends { nodes: string[]; probability: number; endsAtBoss: boolean; from?: number }>(
  candidates: T[],
  target: string | undefined,
  bossLetters: string[],
): (T & { reachesTarget: boolean; passedTarget?: boolean })[] {
  if (target === undefined) return candidates.map((c) => ({ ...c, reachesTarget: c.endsAtBoss }))
  const out: (T & { reachesTarget: boolean; passedTarget?: boolean })[] = []
  const byNodes = new Map<string, T & { reachesTarget: boolean; passedTarget?: boolean }>()
  for (const c of candidates) {
    const at = c.nodes.indexOf(target, 1)
    if (at < 0) {
      out.push({ ...c, reachesTarget: false })
      continue
    }
    const nodes = c.nodes.slice(0, at + 1)
    const key = JSON.stringify([nodes, c.from])
    const merged = byNodes.get(key)
    if (merged) {
      merged.probability += c.probability
      continue
    }
    const passed = at < (c.from ?? 1)
    const cut = {
      ...c,
      nodes,
      endsAtBoss: endsAtBoss(nodes, bossLetters),
      reachesTarget: true,
      ...(passed ? { passedTarget: true } : {}),
    }
    byNodes.set(key, cut)
    out.push(cut)
  }
  return out
}
