import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ensureMapFetched,
  markMapFetched,
  readFetchedMaps,
  stopPrefetch,
  untilAborted,
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

describe('event variants', () => {
  const variant = { name: 'd4-g2-c0-L1_4800', args: ['--difficulty', '4', '--cleared', '0'] }

  it("fetches a variant with its flags and records it under map/variant", async () => {
    const { workDir, children, opts } = setup()
    const p = ensureMapFetched('62-3', { ...opts, variant })
    await spawned(children, 1)
    expect(children[0]?.args.slice(0, 7)).toEqual(['kcnav', 'fetch', '--map', '62-3', '--all-nodes', '--difficulty', '4'])
    expect(children[0]?.args.at(-1)).toMatch(/kcnav-fetch-62-3_d4-g2-c0-L1_4800\.log$/)
    exit(children[0], 0)
    expect(await p).toBe(true)
    expect(Object.keys(readFetchedMaps(workDir))).toEqual(['62-3/d4-g2-c0-L1_4800'])
  })

  it('fetches another variant of a fetched map separately', async () => {
    const { workDir, children, opts } = setup()
    markMapFetched(workDir, '62-3/d4-g1-c0-Lx')
    void ensureMapFetched('62-3', { ...opts, variant })
    await spawned(children, 1)
    expect(await ensureMapFetched('62-3', { ...opts, variant: { name: 'd4-g1-c0-Lx', args: [] } })).toBe(true)
    expect(children).toHaveLength(1)
  })

  it('shares one fetch per variant', async () => {
    const { children, opts } = setup()
    const a = ensureMapFetched('62-3', { ...opts, variant })
    await spawned(children, 1)
    expect(ensureMapFetched('62-3', { ...opts, variant })).toBe(a)
    exit(children[0], 0)
    expect(await a).toBe(true)
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
