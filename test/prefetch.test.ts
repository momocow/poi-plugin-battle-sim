import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ensureMapFetched,
  isNormalMap,
  markMapFetched,
  onQueueStatus,
  prefetchMaps,
  queueStatus,
  readFetchedMaps,
  stopPrefetch,
  untilAborted,
  type QueueStatus,
} from '../src/optimizer/prefetch'
import { Cancelled, kcnavFetchArgs } from '../src/optimizer/run'
import { fakeSpawn, tempDir, type FakeChild } from './helpers'

const tick = () => new Promise((r) => setImmediate(r))

/** Let the fetch get past its mkdirs and spawn. */
const spawned = async (children: FakeChild[], n: number) => {
  for (let i = 0; i < 50 && children.length < n; i++) await tick()
  expect(children).toHaveLength(n)
}

const exit = (child: FakeChild | undefined, code: number) => (child as unknown as EventEmitter).emit('close', code)

const setup = () => {
  const workDir = tempDir()
  const { spawn, children } = fakeSpawn()
  const opts = { binPath: '/opt/optimizer', dataDir: '/opt/data', workDir, spawn }
  return { workDir, children, opts }
}

afterEach(() => stopPrefetch())

describe('fetched-maps marker', () => {
  it('reads a missing or corrupt file as empty', () => {
    const dir = tempDir()
    expect(readFetchedMaps(dir)).toEqual({})
    writeFileSync(join(dir, 'kcnav-fetched.json'), '{not json')
    expect(readFetchedMaps(dir)).toEqual({})
    writeFileSync(join(dir, 'kcnav-fetched.json'), '[]')
    expect(readFetchedMaps(dir)).toEqual({})
  })

  it('keeps earlier maps when another is added', () => {
    const dir = tempDir()
    markMapFetched(dir, '5-2', new Date('2026-10-01T00:00:00Z'))
    markMapFetched(dir, '1-1', new Date('2026-10-02T00:00:00Z'))
    expect(readFetchedMaps(dir)).toEqual({ '5-2': '2026-10-01T00:00:00.000Z', '1-1': '2026-10-02T00:00:00.000Z' })
  })
})

describe('ensureMapFetched', () => {
  it('fetches every node of the map into the kcnav cache, logging per map', async () => {
    const { children, opts } = setup()
    void ensureMapFetched('5-2', opts)
    await spawned(children, 1)
    expect(children[0]?.args).toEqual(kcnavFetchArgs({ ...opts, map: '5-2' }))
    expect(children[0]?.args.slice(0, 5)).toEqual(['kcnav', 'fetch', '--map', '5-2', '--all-nodes'])
    expect(children[0]?.args.at(-1)).toMatch(/logs[\\/]kcnav-fetch-5-2\.log$/)
  })

  it('shares one fetch between callers of the same map and marks it on exit 0', async () => {
    const { workDir, children, opts } = setup()
    const a = ensureMapFetched('5-2', opts)
    const b = ensureMapFetched('5-2', opts)
    await spawned(children, 1)
    expect(ensureMapFetched('5-2', opts)).toBe(a)
    exit(children[0], 0)
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(Object.keys(readFetchedMaps(workDir))).toEqual(['5-2'])
  })

  it('fetches different maps in parallel and records both when they finish together', async () => {
    const { workDir, children, opts } = setup()
    const a = ensureMapFetched('5-2', opts)
    const b = ensureMapFetched('1-1', opts)
    await spawned(children, 2)
    exit(children[0], 0)
    exit(children[1], 0)
    expect(await Promise.all([a, b])).toEqual([true, true])
    expect(Object.keys(readFetchedMaps(workDir)).sort()).toEqual(['1-1', '5-2'])
  })

  it('does not spawn for a map already marked', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '5-2')
    expect(await ensureMapFetched('5-2', opts)).toBe(true)
    expect(children).toHaveLength(0)
  })

  it('keeps fetching when a waiting run is cancelled', async () => {
    const { workDir, children, opts } = setup()
    const controller = new AbortController()
    const wait = untilAborted(ensureMapFetched('5-2', opts), controller.signal)
    await spawned(children, 1)
    controller.abort()
    await expect(wait).rejects.toBeInstanceOf(Cancelled)
    expect(children[0]?.killed).toBe(false)
    exit(children[0], 0)
    expect(await ensureMapFetched('5-2', opts)).toBe(true)
    expect(Object.keys(readFetchedMaps(workDir))).toEqual(['5-2'])
  })

  it('gives false and no marker on a failed exit, and fetches again next time', async () => {
    const { workDir, children, opts } = setup()
    const first = ensureMapFetched('5-2', opts)
    await spawned(children, 1)
    exit(children[0], 1)
    expect(await first).toBe(false)
    expect(readFetchedMaps(workDir)).toEqual({})
    void ensureMapFetched('5-2', opts)
    await spawned(children, 2)
  })

  it('gives false when the process cannot be started', async () => {
    const { workDir, children, opts } = setup()
    const p = ensureMapFetched('5-2', opts)
    await spawned(children, 1)
    ;(children[0] as unknown as EventEmitter).emit('error', new Error('ENOENT'))
    expect(await p).toBe(false)
    expect(readFetchedMaps(workDir)).toEqual({})
  })

  it('stopPrefetch kills every running fetch and gives false', async () => {
    const { workDir, children, opts } = setup()
    const a = ensureMapFetched('5-2', opts)
    const b = ensureMapFetched('1-1', opts)
    await spawned(children, 2)
    stopPrefetch()
    expect(await Promise.all([a, b])).toEqual([false, false])
    expect(children.every((c) => c.killed)).toBe(true)
    expect(readFetchedMaps(workDir)).toEqual({})
  })
})

describe('forced fetch', () => {
  it('passes --force and spawns for a map already marked', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '5-2', new Date('2026-01-01'))
    const p = ensureMapFetched('5-2', { ...opts, force: true })
    await spawned(children, 1)
    expect(children[0]?.args.at(-1)).toBe('--force')
    exit(children[0], 0)
    expect(await p).toBe(true)
    expect(readFetchedMaps(workDir)['5-2']).not.toBe('2026-01-01T00:00:00.000Z')
  })

  it('waits for a plain fetch of the map, then downloads again', async () => {
    const { children, opts } = setup()
    const plain = ensureMapFetched('5-2', opts)
    const forced = ensureMapFetched('5-2', { ...opts, force: true })
    expect(ensureMapFetched('5-2', { ...opts, force: true })).not.toBe(plain)
    await spawned(children, 1)
    exit(children[0], 0)
    expect(await plain).toBe(true)
    await spawned(children, 2)
    expect(children[1]?.args).toContain('--force')
    exit(children[1], 0)
    expect(await forced).toBe(true)
  })

  it('keeps the old record when it fails', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '5-2', new Date('2026-01-01'))
    const p = ensureMapFetched('5-2', { ...opts, force: true })
    await spawned(children, 1)
    exit(children[0], 1)
    expect(await p).toBe(false)
    expect(readFetchedMaps(workDir)).toEqual({ '5-2': '2026-01-01T00:00:00.000Z' })
  })
})

describe('isNormalMap', () => {
  it('keeps areas below the first event area', () => {
    expect(['1-1', '7-5', '22-1', '62-5', 'x'].filter(isNormalMap)).toEqual(['1-1', '7-5'])
  })
})

describe('prefetchMaps', () => {
  /** Every status published until `off` is called. */
  const recordStatus = () => {
    const seen: QueueStatus[] = []
    const off = onQueueStatus(() => seen.push(queueStatus()))
    return { seen, off }
  }
  const mapOf = (child: FakeChild | undefined) => child?.args[3]
  /** No pause between maps, unless a test sets one. */
  const quick = <T extends object>(opts: T) => ({ ...opts, gapMs: 0 })

  it('fetches one map at a time in map order, skipping recorded maps, and reports progress', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '1-1')
    const { seen, off } = recordStatus()
    const queue = prefetchMaps(['10-1', '1-1', '2-1'], quick(opts))
    await spawned(children, 1)
    expect(mapOf(children[0])).toBe('2-1')
    exit(children[0], 0)
    await spawned(children, 2)
    expect(mapOf(children[1])).toBe('10-1')
    exit(children[1], 0)
    await queue
    off()
    const running = { kind: 'running', force: false, total: 2 }
    expect(seen).toEqual([
      { ...running, done: 0, current: '2-1', waiting: false },
      { ...running, done: 1, current: '10-1', waiting: true },
      { ...running, done: 1, current: '10-1', waiting: false },
      undefined,
    ])
  })

  it('publishes nothing when every map is recorded', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '1-1')
    const { seen, off } = recordStatus()
    await prefetchMaps(['1-1'], quick(opts))
    off()
    expect(seen).toEqual([])
    expect(children).toHaveLength(0)
  })

  it('pauses between maps', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1', '1-2'], { ...opts, gapMs: 60 })
    await spawned(children, 1)
    exit(children[0], 0)
    for (let i = 0; i < 10; i++) await tick()
    expect(children).toHaveLength(1)
    expect(queueStatus()).toMatchObject({ current: '1-2', waiting: true })
    await new Promise((r) => setTimeout(r, 80))
    await spawned(children, 2)
    exit(children[1], 0)
    await queue
  })

  it('holds its next map while a run fetches another', async () => {
    const { children, opts } = setup()
    const run = ensureMapFetched('5-5', opts)
    await spawned(children, 1)
    const queue = prefetchMaps(['1-1'], quick(opts))
    for (let i = 0; i < 10; i++) await tick()
    expect(children).toHaveLength(1)
    expect(queueStatus()).toMatchObject({ current: '1-1', waiting: true })
    exit(children[0], 0)
    await run
    await spawned(children, 2)
    expect(mapOf(children[1])).toBe('1-1')
    exit(children[1], 0)
    await queue
  })

  it('stops at the first failure, leaving that map and the rest', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1', '1-2', '1-3'], quick(opts))
    await spawned(children, 1)
    exit(children[0], 0)
    await spawned(children, 2)
    exit(children[1], 1)
    await queue
    expect(children).toHaveLength(2)
    expect(queueStatus()).toEqual({ kind: 'failed', force: false, maps: ['1-2', '1-3'] })
  })

  it('drops a failed map once a run fetches it', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1', '1-2'], quick(opts))
    await spawned(children, 1)
    exit(children[0], 1)
    await queue
    expect(queueStatus()).toEqual({ kind: 'failed', force: false, maps: ['1-1', '1-2'] })
    const run = ensureMapFetched('1-2', opts)
    await spawned(children, 2)
    exit(children[1], 0)
    await run
    expect(queueStatus()).toEqual({ kind: 'failed', force: false, maps: ['1-1'] })
  })

  it('keeps force in the failed status for a retry', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1'], quick({ ...opts, force: true }))
    await spawned(children, 1)
    expect(children[0]?.args).toContain('--force')
    expect(queueStatus()).toMatchObject({ kind: 'running', force: true })
    exit(children[0], 1)
    await queue
    expect(queueStatus()).toEqual({ kind: 'failed', force: true, maps: ['1-1'] })
  })

  it('waits for the fetch a run already started on its map, then skips it', async () => {
    const { children, opts } = setup()
    const run = ensureMapFetched('1-1', opts)
    const queue = prefetchMaps(['1-1', '1-2'], quick(opts))
    await spawned(children, 1)
    exit(children[0], 0)
    await run
    await spawned(children, 2)
    expect(mapOf(children[1])).toBe('1-2')
    exit(children[1], 0)
    await queue
    expect(children).toHaveLength(2)
  })

  it('does nothing while another queue runs', async () => {
    const { children, opts } = setup()
    void prefetchMaps(['1-1'], quick(opts))
    await spawned(children, 1)
    await prefetchMaps(['1-2'], quick(opts))
    await tick()
    expect(children).toHaveLength(1)
  })

  it('stops on stopPrefetch: the current fetch is killed and no later map spawns', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1', '1-2'], quick(opts))
    await spawned(children, 1)
    stopPrefetch()
    await queue
    expect(children[0]?.killed).toBe(true)
    for (let i = 0; i < 10; i++) await tick()
    expect(children).toHaveLength(1)
    expect(queueStatus()).toBeUndefined()
    // A new queue may start after a stop.
    void prefetchMaps(['1-2'], quick(opts))
    await spawned(children, 2)
  })

  it('stops on stopPrefetch during its pause', async () => {
    const { children, opts } = setup()
    const queue = prefetchMaps(['1-1', '1-2'], { ...opts, gapMs: 60_000 })
    await spawned(children, 1)
    exit(children[0], 0)
    for (let i = 0; i < 10; i++) await tick()
    stopPrefetch()
    await queue
    expect(children).toHaveLength(1)
    expect(queueStatus()).toBeUndefined()
  })
})

describe('untilAborted', () => {
  it('passes the value through when not aborted', async () => {
    expect(await untilAborted(Promise.resolve(3), new AbortController().signal)).toBe(3)
  })

  it('rejects at once for an already aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(untilAborted(new Promise(() => undefined), controller.signal)).rejects.toBeInstanceOf(Cancelled)
  })
})
