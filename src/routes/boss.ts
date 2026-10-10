/**
 * Which candidates reach the boss, from the optimizer's bundled `maps.json`
 * (`{"5-2": {"boss_letters": ["O"]}, …}`). A candidate reaches the boss when
 * its last node is one of the map's boss letters. No network access.
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

export const reachesBoss = (nodes: string[], bossLetters: string[]): boolean => {
  const last = nodes[nodes.length - 1]
  return last !== undefined && bossLetters.includes(last)
}
