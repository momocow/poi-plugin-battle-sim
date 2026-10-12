/**
 * Which kcnav directory holds a map's data: the game-data package's snapshot
 * when it covers the map (and, for an event map, the variant), else the
 * plugin's own fetches under poi's app data. A covered map never reads the
 * plugin's directory, so the package's data wins over an older fetch of the
 * same map without anything being copied or deleted.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { kcnavDir } from '../optimizer/run'
import type { GameData } from './manifest'

/** Whether the package has the map's topology and, for `variant`, that variant's directory. */
export function packageCovers(data: GameData | undefined, map: string, variant?: string): boolean {
  if (!data || !existsSync(join(data.kcnavDir, map, '_map.json'))) return false
  return variant === undefined || existsSync(join(data.kcnavDir, map, variant))
}

/** The directory to read the map's data from: the package's when it covers it, else `<workDir>/kcnav`. */
export const kcnavDirFor = (data: GameData | undefined, work: string, map: string, variant?: string): string =>
  packageCovers(data, map, variant) ? data!.kcnavDir : kcnavDir(work)
