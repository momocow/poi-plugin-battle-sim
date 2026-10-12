/**
 * One version of the game-data package (`poi-plugin-battle-sim-data`, kept in
 * the repo's `fcd/`), read and checked: its `manifest.json` names the parts,
 * each with a format version and a path. A part this plugin doesn't need is
 * ignored; a needed part that is missing, in a format this plugin can't read,
 * or whose contents fail its check makes the whole version unusable, so it is
 * never half used. See `fcd/README.md` for the formats.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import type { MapChoices } from '../routes/choices'

/** The parts this plugin reads, and the format of each it can read. */
export const NEEDED_PARTS = {
  optimizer: 1,
  mapChoices: 1,
  nodeDistances: 1,
  eventGauges: 1,
  kcnav: 1,
} as const

export interface GameData {
  version: string
  /** The package directory (the one holding `manifest.json`). */
  root: string
  /** The optimizer's `--data-dir`. */
  dataDir: string
  /** The kcnav snapshot, in the optimizer's cache layout. */
  kcnavDir: string
  mapChoices: Record<string, MapChoices>
  /** Map → node letter → distance from the land bases. */
  nodeDistances: Record<string, Record<string, number>>
  /** Map → difficulty (1–4) → gauge number → the HP at or below which the gauge is in its last dance. */
  eventGauges: Record<string, Record<string, Record<string, number>>>
}

export class UnusableGameData extends Error {
  constructor(root: string, reason: string) {
    super(`${root}: ${reason}`)
    this.name = 'UnusableGameData'
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string' && s !== '')

/** `{ maps: { [map]: … } }`, each map's value checked by `entry`. */
function mapsOf<T>(value: unknown, fail: (reason: string) => never, entry: (map: string, v: unknown) => T): Record<string, T> {
  if (!isRecord(value) || !isRecord(value.maps)) fail('has no "maps" object')
  return Object.fromEntries(Object.entries(value.maps).map(([map, v]) => [map, entry(map, v)]))
}

/**
 * The version at `root`, checked; throws `UnusableGameData` when it can't be used. `version` defaults to the
 * one in the package's own package.json.
 */
export function readGameData(root: string, version?: string): GameData {
  const fail = (reason: string): never => {
    throw new UnusableGameData(root, reason)
  }
  const readJson = (path: string): unknown => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'))
    } catch (err) {
      return fail(`${path} can't be read: ${String(err)}`)
    }
  }
  const manifest = readJson(join(root, 'manifest.json'))
  if (!isRecord(manifest) || !isRecord(manifest.parts)) fail('manifest.json has no "parts" object')
  const parts = (manifest as { parts: Record<string, unknown> }).parts
  const pathOf = (name: keyof typeof NEEDED_PARTS): string => {
    const part = parts[name]
    if (!isRecord(part)) return fail(`has no "${name}" part`)
    if (part.format !== NEEDED_PARTS[name]) fail(`its "${name}" part is format ${String(part.format)}, not ${NEEDED_PARTS[name]}`)
    if (typeof part.path !== 'string' || part.path === '' || part.path.includes('..')) fail(`its "${name}" part has a bad path`)
    return join(root, part.path as string)
  }
  const isDir = (path: string) => existsSync(path) && statSync(path).isDirectory()

  const dataDir = pathOf('optimizer')
  if (!isDir(dataDir) || !existsSync(join(dataDir, 'maps.json'))) fail('its optimizer part has no maps.json')
  const kcnavDir = pathOf('kcnav')
  if (!isDir(kcnavDir)) fail('its kcnav part is not a directory')

  const mapChoices = mapsOf(readJson(pathOf('mapChoices')), fail, (map, v): MapChoices => {
    const bad = (what: string) => fail(`map choices for ${map}: ${what}`)
    if (!isRecord(v) || !Array.isArray(v.branches)) return bad('no branches')
    const branches = v.branches.map((b: unknown) => {
      if (!isRecord(b) || typeof b.node !== 'string' || !isStrings(b.targets) || typeof b.default !== 'string') {
        return bad('a branch is malformed')
      }
      if (!b.targets.includes(b.default)) bad(`${b.node}'s default ${b.default} is not one of its targets`)
      return { node: b.node, targets: [...b.targets], default: b.default }
    })
    if (v.phases === undefined) return { branches }
    if (!Array.isArray(v.phases) || v.phases.length === 0) return bad('phases is not a list')
    const phases = v.phases.map((p: unknown) =>
      isRecord(p) && typeof p.value === 'string' && typeof p.label === 'string'
        ? { value: p.value, label: p.label }
        : bad('a phase is malformed'),
    )
    return { branches, phases }
  })

  const nodeDistances = mapsOf(readJson(pathOf('nodeDistances')), fail, (map, v) => {
    if (!isRecord(v) || !Object.values(v).every(isCount)) fail(`node distances for ${map} are not whole numbers of at least 1`)
    return v as Record<string, number>
  })

  const eventGauges = mapsOf(readJson(pathOf('eventGauges')), fail, (map, v) => {
    const ok =
      isRecord(v) &&
      Object.entries(v).every(
        ([difficulty, gauges]) => /^[1-4]$/.test(difficulty) && isRecord(gauges) && Object.values(gauges).every(isCount),
      )
    if (!ok) fail(`event gauges for ${map} are malformed`)
    return v as Record<string, Record<string, number>>
  })

  if (version === undefined) {
    const pkg = readJson(join(root, 'package.json'))
    if (!isRecord(pkg) || typeof pkg.version !== 'string') fail('package.json has no version')
    version = (pkg as { version: string }).version
  }
  return { version, root, dataDir, kcnavDir, mapChoices, nodeDistances, eventGauges }
}
