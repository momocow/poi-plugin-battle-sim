/**
 * The developer log: while `plugin.poi_battle_sim.devLog` is on, one JSON line
 * per event (`{ time, event, …data }`) in `<workDir>/logs/dev.ndjson`, so that
 * behavior seen in the game — a rare special attack, a mid-sortie narrowing, an
 * automatic run — can be checked afterwards. Off, nothing is written.
 *
 * The flag is read on every call, so the settings page applies at once. A file
 * over 2 MB moves to `dev.1.ndjson`, replacing the one before. Logging never
 * fails the plugin: errors are swallowed.
 */
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { workDir } from './paths'
import { loadDevLog } from './ui/inputs'

const MAX_BYTES = 2 * 1024 * 1024

export const devLogPath = (): string => join(workDir(), 'logs', 'dev.ndjson')

export function devLog(event: string, data: Record<string, unknown> = {}): void {
  if (!loadDevLog()) return
  try {
    const file = devLogPath()
    mkdirSync(join(file, '..'), { recursive: true })
    try {
      if (statSync(file).size > MAX_BYTES) renameSync(file, join(file, '..', 'dev.1.ndjson'))
    } catch {
      // No file yet.
    }
    appendFileSync(file, JSON.stringify({ time: new Date().toISOString(), event, ...data }) + '\n')
  } catch {
    // A log that can't be written must not break the plugin.
  }
}
