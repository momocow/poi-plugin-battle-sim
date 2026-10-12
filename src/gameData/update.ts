/**
 * Newer versions of the game-data package, from the npm registry, installed
 * only when the user approves.
 *
 * The check runs when the plugin loads and then every 6 hours. It reads the
 * package's abbreviated packument and takes the newest plain `x.y.z` version
 * with the bundled copy's major; that version is *available* when it is newer
 * than every version the plugin has (bundled, saved or in use). A check never
 * downloads, never changes the data in use, and fails silently into the
 * developer log; none runs while an update downloads.
 *
 * An approved update downloads the version's tarball, checks it against the
 * registry's `dist.integrity` (sha512), unpacks it into a temporary directory
 * under `<workDir>/game-data/`, checks it is usable, and only then renames it
 * to `<version>/` and switches to it. A failure leaves the data in use as it
 * was and nothing saved, and is reported in the status for the panel's prompt.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { devLog } from '../devlog'
import { readGameData } from './manifest'
import { compareVersions, gameData, majorOf, PACKAGE_NAME, pruneSaved, savedDir, savedVersions, setGameData } from './store'
import { extractTarball } from './tar'

export const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}`
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface AvailableVersion {
  version: string
  tarball: string
  /** SRI, `sha512-<base64>`. */
  integrity: string
}

export interface UpdateStatus {
  /** A newer version found by the last check; cleared once installed. */
  available?: AvailableVersion
  phase: 'idle' | 'downloading' | 'failed' | 'done'
  /** Why the last update failed. */
  error?: string
  /** The version the last update installed. */
  installed?: string
}

type FetchFn = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
}>

export interface UpdateEnv {
  /** The plugin's app data directory. */
  work: string
  fetch?: FetchFn
}

let status: UpdateStatus = { phase: 'idle' }
const listeners = new Set<() => void>()

function setStatus(next: UpdateStatus): void {
  status = next
  for (const listener of listeners) listener()
}

/** The same object until the status changes, as `useSyncExternalStore` needs. */
export const updateStatus = (): UpdateStatus => status

export function onUpdateStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)

/** The newest version in a packument with `major`, as published; undefined when none is usable. */
export function newestOfMajor(packument: unknown, major: number): AvailableVersion | undefined {
  if (!isRecord(packument) || !isRecord(packument.versions)) return undefined
  let best: AvailableVersion | undefined
  for (const [version, meta] of Object.entries(packument.versions)) {
    if (!/^\d+\.\d+\.\d+$/.test(version) || majorOf(version) !== major || !isRecord(meta) || !isRecord(meta.dist)) continue
    const { tarball, integrity } = meta.dist
    if (typeof tarball !== 'string' || typeof integrity !== 'string' || !integrity.startsWith('sha512-')) continue
    if (!best || compareVersions(version, best.version) > 0) best = { version, tarball, integrity }
  }
  return best
}

/** Look for a newer version; sets `available` when there is one. Never throws. */
export async function checkForUpdate(env: UpdateEnv): Promise<void> {
  if (status.phase === 'downloading') return
  const inUse = gameData()
  if (!inUse) return
  try {
    const res = await (env.fetch ?? (globalThis.fetch as unknown as FetchFn))(REGISTRY_URL, {
      headers: { Accept: 'application/vnd.npm.install-v1+json' },
    })
    if (!res.ok) throw new Error(`registry answered ${res.status}`)
    const newest = newestOfMajor(await res.json(), majorOf(inUse.version))
    const have = [inUse.version, ...savedVersions(env.work)].filter((v) => majorOf(v) === majorOf(inUse.version))
    const isNewer = newest !== undefined && have.every((v) => compareVersions(newest.version, v) > 0)
    devLog('gameData.checked', { inUse: inUse.version, newest: newest?.version, available: isNewer })
    // A download may have started while the registry answered.
    if (updateStatus().phase === 'downloading') return
    if (isNewer && newest.version !== status.available?.version) setStatus({ phase: 'idle', available: newest })
  } catch (err) {
    devLog('gameData.checkFailed', { error: String(err) })
  }
}

/** Download, verify and switch to the available version. Never throws; the outcome is in the status. */
export async function applyUpdate(env: UpdateEnv): Promise<void> {
  const target = status.available
  if (!target || status.phase === 'downloading') return
  setStatus({ phase: 'downloading', available: target })
  const tmp = join(savedDir(env.work), `.tmp-${target.version}-${process.pid}`)
  try {
    const res = await (env.fetch ?? (globalThis.fetch as unknown as FetchFn))(target.tarball)
    if (!res.ok) throw new Error(`download answered ${res.status}`)
    const tarball = Buffer.from(await res.arrayBuffer())
    const actual = `sha512-${createHash('sha512').update(tarball).digest('base64')}`
    if (actual !== target.integrity) throw new Error(`integrity mismatch: expected ${target.integrity}, got ${actual}`)
    rmSync(tmp, { recursive: true, force: true })
    mkdirSync(tmp, { recursive: true })
    extractTarball(tarball, tmp)
    readGameData(tmp, target.version)
    const dest = join(savedDir(env.work), target.version)
    rmSync(dest, { recursive: true, force: true })
    renameSync(tmp, dest)
    setGameData(readGameData(dest, target.version))
    pruneSaved(env.work, target.version)
    devLog('gameData.updated', { version: target.version })
    setStatus({ phase: 'done', installed: target.version })
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true })
    devLog('gameData.updateFailed', { version: target.version, error: String(err) })
    setStatus({ phase: 'failed', available: target, error: err instanceof Error ? err.message : String(err) })
  }
}

let timer: ReturnType<typeof setInterval> | undefined

/** Check now and every `CHECK_INTERVAL_MS` until `stopUpdateChecks`. */
export function startUpdateChecks(env: UpdateEnv): void {
  stopUpdateChecks()
  void checkForUpdate(env)
  timer = setInterval(() => void checkForUpdate(env), CHECK_INTERVAL_MS)
}

export function stopUpdateChecks(): void {
  clearInterval(timer)
  timer = undefined
}

/** Forget the status (tests). */
export function resetUpdateStatusForTests(): void {
  stopUpdateChecks()
  setStatus({ phase: 'idle' })
}
