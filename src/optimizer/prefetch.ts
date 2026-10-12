/**
 * One shared kcnav fetch per map, or per event variant of a map, for enemy
 * data the game-data package's snapshot doesn't cover, so it is downloaded
 * once rather than by every `simulate` process that needs it, and at most once
 * ever: the snapshot is the primary source, and every player fetching the
 * same data would only load kcnav (which blocks clients that go too fast).
 *
 * A map or variant counts as fetched only once `kcnav fetch --all-nodes` exits
 * 0, which is recorded in `<workDir>/kcnav-fetched.json` under `map` or
 * `map/variant`. The cache directory itself is no signal: the optimizer writes
 * `_map.json` and the map folder before any node.
 *
 * A fetch belongs to the poi session, not to a run: runs wait on it with
 * `untilAborted`, so cancelling a run never stops a download. Only
 * `stopPrefetch` (plugin unload) kills it. The result is `false` on any
 * failure and never rejects. Nothing is fetched in the background.
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { Cancelled, defaultSpawn, kcnavDir, kcnavFetchArgs, type ChildLike, type SpawnFn } from './run'

const markerPath = (workDir: string): string => join(workDir, 'kcnav-fetched.json')

/** Map or `map/variant` → ISO date of its successful fetch. Missing or unreadable reads as empty. */
export function readFetchedMaps(workDir: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(markerPath(workDir), 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Synchronous so two fetches finishing together can't drop each other's entry. `key` is a map or `map/variant`. */
export function markMapFetched(workDir: string, key: string, at = new Date()): void {
  const maps = { ...readFetchedMaps(workDir), [key]: at.toISOString() }
  const path = markerPath(workDir)
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(maps, null, 2))
  renameSync(tmp, path)
}

export interface PrefetchOptions {
  binPath: string
  dataDir: string
  workDir: string
  /** An event map's variant: its directory name and `kcnav fetch` flags. */
  variant?: { name: string; args: string[] }
  spawn?: SpawnFn
}

interface Fetch {
  promise: Promise<boolean>
  child?: ChildLike
}

/** The record's key: the map, or `map/variant`. */
export const fetchKey = (map: string, variant?: { name: string }): string => (variant ? `${map}/${variant.name}` : map)

const fetches = new Map<string, Fetch>()
/** Bumped by `stopPrefetch`, so a fetch still creating directories doesn't spawn afterwards. */
let generation = 0

export function ensureMapFetched(map: string, opts: PrefetchOptions): Promise<boolean> {
  const key = fetchKey(map, opts.variant)
  const running = fetches.get(key)
  if (running) return running.promise
  if (key in readFetchedMaps(opts.workDir)) return Promise.resolve(true)

  const fetch: Fetch = { promise: Promise.resolve(false) }
  fetch.promise = runFetch(map, key, opts, fetch, generation).finally(() => {
    if (fetches.get(key) === fetch) fetches.delete(key)
  })
  fetches.set(key, fetch)
  return fetch.promise
}

async function runFetch(map: string, key: string, opts: PrefetchOptions, fetch: Fetch, started: number): Promise<boolean> {
  try {
    await mkdir(kcnavDir(opts.workDir), { recursive: true })
    await mkdir(join(opts.workDir, 'logs'), { recursive: true })
  } catch {
    return false
  }
  if (started !== generation) return false

  const child = (opts.spawn ?? defaultSpawn)(opts.binPath, kcnavFetchArgs({ ...opts, map, variantArgs: opts.variant?.args, logKey: key }), { cwd: opts.workDir })
  fetch.child = child
  const ok = await new Promise<boolean>((resolve) => {
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
    // Output goes to the log file; drain the pipes so a full buffer can't stall the process.
    child.stdout.resume()
    child.stderr.resume()
    child.stdin.on('error', () => undefined)
    child.stdin.end()
  })
  if (!ok || started !== generation) return false
  try {
    markMapFetched(opts.workDir, key)
  } catch {
    return false
  }
  return true
}

/** Kill every running fetch; their callers get `false`. */
export function stopPrefetch(): void {
  generation++
  for (const fetch of fetches.values()) fetch.child?.kill()
  fetches.clear()
}

/** Wait for `promise`, but reject with `Cancelled` once `signal` aborts. `promise` itself is left alone. */
export function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Cancelled())
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Cancelled())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}
