/**
 * One shared kcnav fetch per map, so a map's enemy data is downloaded once
 * rather than by every `simulate` process that needs it, and a queue that
 * fetches a list of maps one at a time ahead of any run.
 *
 * A map counts as fetched only once `kcnav fetch --all-nodes` exits 0, which
 * is recorded in `<workDir>/kcnav-fetched.json`. The cache directory itself is
 * no signal: the optimizer writes `_map.json` and the map folder before any
 * node, and a `simulate` that fetched only its own route leaves them too.
 * A forced fetch (`--force`) downloads a map again over its cached nodes,
 * whatever the record says; if it fails, the record and the files it didn't
 * overwrite stay as they were.
 *
 * A fetch belongs to the poi session, not to a run: runs wait on it with
 * `untilAborted`, so cancelling a run never stops a download. Only
 * `stopPrefetch` (plugin unload) kills it. Different maps fetch in parallel.
 * The result is `false` on any failure and never rejects — the sims still
 * fetch what their route lacks by themselves.
 *
 * The queue (`prefetchMaps`: startup, retry, refresh) goes through the same
 * per-map fetch, so a run joins the map it is on and it skips a map a run has
 * fetched. Only one queue runs at a time. It is paced for kcnav, which blocked
 * the plugin's address when a queue and a run fetched together: it pauses
 * between maps, holds while any other fetch runs, and stops at the first
 * failure. Its progress, and then the maps it did not fetch, are published as `queueStatus` for the panel's footer and the
 * settings page.
 *
 * The fetch passes no event-map options, matching the simulate TOML. If the
 * sims ever get difficulty or phase options, the fetch needs the same ones, or
 * the sims miss its cache.
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { Cancelled, defaultSpawn, kcnavDir, kcnavFetchArgs, type ChildLike, type SpawnFn } from './run'

const markerPath = (workDir: string): string => join(workDir, 'kcnav-fetched.json')

/** Map → ISO date of its successful fetch. Missing or unreadable reads as empty. */
export function readFetchedMaps(workDir: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(markerPath(workDir), 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** Synchronous so two fetches finishing together can't drop each other's entry. */
export function markMapFetched(workDir: string, map: string, at = new Date()): void {
  const maps = { ...readFetchedMaps(workDir), [map]: at.toISOString() }
  const path = markerPath(workDir)
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(maps, null, 2))
  renameSync(tmp, path)
}

export interface PrefetchOptions {
  binPath: string
  dataDir: string
  workDir: string
  /** Download again over the cache, even for a map recorded as fetched. */
  force?: boolean
  spawn?: SpawnFn
}

interface Fetch {
  promise: Promise<boolean>
  force: boolean
  child?: ChildLike
}

const fetches = new Map<string, Fetch>()
/** Bumped by `stopPrefetch`, so a fetch still creating directories doesn't spawn afterwards. */
let generation = 0

export function ensureMapFetched(map: string, opts: PrefetchOptions): Promise<boolean> {
  const force = opts.force ?? false
  const running = fetches.get(map)
  if (running) {
    if (running.force || !force) return running.promise
    // A plain fetch skips cached nodes, so a forced one waits for it and then downloads again.
    const started = generation
    return running.promise.then(() => (started === generation ? ensureMapFetched(map, opts) : false))
  }
  if (!force && map in readFetchedMaps(opts.workDir)) return Promise.resolve(true)

  const fetch: Fetch = { promise: Promise.resolve(false), force }
  fetch.promise = runFetch(map, opts, fetch, generation).finally(() => {
    if (fetches.get(map) === fetch) fetches.delete(map)
  })
  fetches.set(map, fetch)
  return fetch.promise
}

async function runFetch(map: string, opts: PrefetchOptions, fetch: Fetch, started: number): Promise<boolean> {
  try {
    await mkdir(kcnavDir(opts.workDir), { recursive: true })
    await mkdir(join(opts.workDir, 'logs'), { recursive: true })
  } catch {
    return false
  }
  if (started !== generation) return false

  const child = (opts.spawn ?? defaultSpawn)(opts.binPath, kcnavFetchArgs({ ...opts, map, force: fetch.force }), { cwd: opts.workDir })
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
    markMapFetched(opts.workDir, map)
  } catch {
    return false
  }
  if (status?.kind === 'failed' && status.maps.includes(map)) {
    const maps = status.maps.filter((m) => m !== map)
    setStatus(maps.length > 0 ? { ...status, maps } : undefined)
  }
  return true
}

/** Below the game's first event area (21). */
export function isNormalMap(map: string): boolean {
  const [area, no] = map.split('-').map(Number)
  return Number.isInteger(area) && Number.isInteger(no) && area! >= 1 && area! < 21
}

/** `2-1` before `10-1`, unlike a string sort. */
const byMapNumber = (a: string, b: string): number => {
  const [aArea = 0, aNo = 0] = a.split('-').map(Number)
  const [bArea = 0, bNo = 0] = b.split('-').map(Number)
  return aArea - bArea || aNo - bNo
}

/**
 * A queue of map fetches, while one runs, then the maps it failed until they
 * are fetched or another queue starts. `force` is the queue's, so a retry of a
 * refresh is forced too.
 */
export type QueueStatus =
  /** `waiting`: pausing or holding before `current`, which is not being fetched yet. */
  | { kind: 'running'; force: boolean; done: number; total: number; current: string; waiting: boolean }
  | { kind: 'failed'; force: boolean; maps: string[] }
  | undefined

let status: QueueStatus
let queueRunning = false
/** Ends the queue's pause early; set while it pauses, so `stopPrefetch` doesn't leave a timer behind. */
let endPause: (() => void) | undefined

/** The pause between two maps of a queue. */
export const MAP_GAP_MS = 30_000

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const end = () => {
      clearTimeout(timer)
      endPause = undefined
      resolve()
    }
    const timer = setTimeout(end, ms)
    endPause = end
  })
}

/** Until no fetch is running, so a run's fetch never overlaps the queue's next one. */
async function noFetchRunning(): Promise<void> {
  while (fetches.size > 0) await Promise.all([...fetches.values()].map((fetch) => fetch.promise))
}
const listeners = new Set<() => void>()

function setStatus(next: QueueStatus): void {
  status = next
  for (const listener of listeners) listener()
}

/** The same object until the status changes, as `useSyncExternalStore` needs. */
export const queueStatus = (): QueueStatus => status

export function onQueueStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Fetch `maps` one at a time, in map order, skipping those recorded as fetched
 * unless forced. Before each map it pauses (`gapMs`, after the first) and
 * holds while another fetch runs; it stops at the first failure, which leaves
 * that map and the rest not fetched. Does nothing while another queue runs.
 * Never rejects.
 */
export async function prefetchMaps(maps: string[], opts: PrefetchOptions & { gapMs?: number }): Promise<void> {
  if (queueRunning) return
  const force = opts.force ?? false
  const gapMs = opts.gapMs ?? MAP_GAP_MS
  const recorded = force ? {} : readFetchedMaps(opts.workDir)
  const todo = [...maps].sort(byMapNumber).filter((map) => !(map in recorded))
  if (todo.length === 0) return

  const started = generation
  queueRunning = true
  let failed: string[] = []
  for (const [done, current] of todo.entries()) {
    const progress = { kind: 'running', force, done, total: todo.length, current } as const
    if (done > 0 || fetches.size > 0) {
      setStatus({ ...progress, waiting: true })
      if (done > 0) await pause(gapMs)
      await noFetchRunning()
      // `stopPrefetch` has already cleared the status and the running flag.
      if (started !== generation) return
    }
    setStatus({ ...progress, waiting: false })
    const ok = await ensureMapFetched(current, opts)
    if (started !== generation) return
    if (!ok) {
      failed = todo.slice(done)
      break
    }
  }
  queueRunning = false
  // A run may have fetched one of them meanwhile; a forced map is recorded either way.
  const fetched = force ? {} : readFetchedMaps(opts.workDir)
  const left = failed.filter((map) => !(map in fetched))
  setStatus(left.length > 0 ? { kind: 'failed', force, maps: left } : undefined)
}

/** Kill every running fetch and the queue; their callers get `false`. */
export function stopPrefetch(): void {
  generation++
  for (const fetch of fetches.values()) fetch.child?.kill()
  fetches.clear()
  endPause?.()
  queueRunning = false
  setStatus(undefined)
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
