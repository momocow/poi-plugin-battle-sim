/**
 * Whether the optimizer has ever cached a map's kcnav data.
 *
 * The optimizer (0.2.0+) fetches whatever a route is missing by itself, with
 * concurrency-safe writes, so this is only a hint: on a map's first run the
 * panel says enemy data is being fetched, and the first route runs alone so
 * two processes don't fetch the same nodes. Per-node files are deliberately
 * not checked — whirlpool nodes never get one, and event-map caches live in
 * per-variant subdirectories.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const isMapCached = (kcnavDir: string, map: string): boolean => existsSync(join(kcnavDir, map, '_map.json'))
