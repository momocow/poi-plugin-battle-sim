import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { devLog } from '../src/devlog'
import { loadDevLog } from '../src/ui/inputs'
import { tempDir } from './helpers'

const win = globalThis as { window?: unknown }
const saved = win.window

/** A poi window with its app data in a fresh directory and `devLog` set as given. */
function poiWith(devLogValue: unknown): string {
  const appData = tempDir()
  win.window = {
    APPDATA_PATH: appData,
    config: { get: (key: string, fallback: unknown) => (key === 'plugin.poi_battle_sim.devLog' ? devLogValue : fallback) },
  }
  return join(appData, 'battle-sim', 'logs', 'dev.ndjson')
}

describe('developer log', () => {
  afterEach(() => {
    win.window = saved
  })

  it('is off unless the config holds true', () => {
    for (const value of [undefined, false, 'true', 1]) {
      poiWith(value)
      expect(loadDevLog()).toBe(false)
    }
    poiWith(true)
    expect(loadDevLog()).toBe(true)
  })

  it('writes nothing while off', () => {
    const file = poiWith(false)
    devLog('run.start', { map: '1-1' })
    expect(existsSync(file)).toBe(false)
  })

  it('appends one JSON line per event while on', () => {
    const file = poiWith(true)
    devLog('sortie.battle', { record: { fired: [100], observed: true } })
    devLog('run.narrowed', { specialAttacksFired: [100] })
    const lines = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(lines.map((l) => l.event)).toEqual(['sortie.battle', 'run.narrowed'])
    expect(lines[1].specialAttacksFired).toEqual([100])
    expect(typeof lines[0].time).toBe('string')
  })

  it('moves a file over 2 MB aside before the next event', () => {
    const file = poiWith(true)
    devLog('sortie.start')
    writeFileSync(file, 'x'.repeat(2 * 1024 * 1024 + 1))
    devLog('sortie.start')
    expect(statSync(join(file, '..', 'dev.1.ndjson')).size).toBeGreaterThan(2 * 1024 * 1024)
    expect(readFileSync(file, 'utf8').trim().split('\n')).toHaveLength(1)
  })

  it('never throws, even without poi', () => {
    win.window = { config: { get: () => true } }
    expect(() => devLog('run.start')).not.toThrow()
  })
})
