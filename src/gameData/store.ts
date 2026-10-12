/**
 * Which version of the game-data package is in use: the newest usable one
 * among the copy installed with the plugin (a dependency, in node_modules) and
 * the versions an approved update saved under `<workDir>/game-data/<version>/`.
 * Only versions with the bundled copy's major count, so a saved version from
 * before a plugin update to a new major is never used. Saved versions older
 * than the one in use are deleted.
 *
 * The data is read once, on first use, and replaced only by an approved update
 * (`setGameData`). A run takes the version in use when it starts and keeps it,
 * so an update during a run changes only the runs after it.
 */
import { readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { devLog } from '../devlog'
import { findPackageRoot, workDir } from '../paths'
import { readGameData, type GameData } from './manifest'

export const PACKAGE_NAME = 'poi-plugin-battle-sim-data'

const VERSION = /^\d+\.\d+\.\d+$/

/** Negative when `a` is older than `b`; both plain `x.y.z`. */
export function compareVersions(a: string, b: string): number {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number))
  for (let i = 0; i < 3; i++) if (pa![i] !== pb![i]) return pa![i]! - pb![i]!
  return 0
}

export const majorOf = (version: string): number => Number(version.split('.')[0])

export const savedDir = (work: string): string => join(work, 'game-data')

/** The installed copy's directory. */
export function bundledRoot(packageRoot = findPackageRoot()): string {
  return dirname(createRequire(join(packageRoot, 'package.json')).resolve(`${PACKAGE_NAME}/package.json`))
}

/** The saved versions, by name; none when the directory is missing. */
export function savedVersions(work: string): string[] {
  try {
    return readdirSync(savedDir(work)).filter((name) => VERSION.test(name))
  } catch {
    return []
  }
}

/** The newest usable version: bundled or saved, with the bundled major. Throws when even the bundled one isn't usable. */
export function loadNewest(opts: { bundled: string; work?: string }): GameData {
  const bundled = readGameData(opts.bundled)
  const saved = opts.work
    ? savedVersions(opts.work)
        .filter((v) => majorOf(v) === majorOf(bundled.version) && compareVersions(v, bundled.version) > 0)
        .sort((a, b) => compareVersions(b, a))
    : []
  for (const version of saved) {
    try {
      return readGameData(join(savedDir(opts.work!), version), version)
    } catch (err) {
      devLog('gameData.unusable', { version, error: String(err) })
    }
  }
  return bundled
}

/** Whether `data` is the copy installed with the plugin, rather than an update saved under `work`. */
export const isBundled = (data: GameData, work: string | undefined): boolean =>
  work === undefined || !data.root.startsWith(savedDir(work))

/** Delete the saved versions older than `keep`. */
export function pruneSaved(work: string, keep: string): void {
  for (const version of savedVersions(work)) {
    if (compareVersions(version, keep) < 0) rmSync(join(savedDir(work), version), { recursive: true, force: true })
  }
}

let current: GameData | undefined
const listeners = new Set<() => void>()

/** poi's app data directory for this plugin, or undefined outside poi (tests). */
export function workDirOrNone(): string | undefined {
  try {
    return workDir()
  } catch {
    return undefined
  }
}

/** The version in use, loaded on first call; undefined when not even the bundled copy is usable. */
export function gameData(): GameData | undefined {
  if (!current) {
    try {
      const work = workDirOrNone()
      current = loadNewest({ bundled: bundledRoot(), work })
      if (work) pruneSaved(work, current.version)
      devLog('gameData.inUse', { version: current.version, root: current.root })
    } catch (err) {
      devLog('gameData.unavailable', { error: String(err) })
      return undefined
    }
  }
  return current
}

/** Switch to another version (an approved update, or a test). */
export function setGameData(data: GameData | undefined): void {
  current = data
  for (const listener of listeners) listener()
}

export function onGameData(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
