import { describe, expect, it } from 'vitest'

import { SimError } from '../src/errors'
import { simulateRoutes } from '../src/optimizer/orchestrate'
import { Cancelled, type SimulateDiag } from '../src/optimizer/run'

const diag = (s: number): SimulateDiag => ({
  ranks: { S: s, A: 0, B: 0, C: 0, D: 0, E: 0 },
  ranks_marginal: { S: s, A: 0, B: 0, C: 0, D: 0, E: 0 },
  reach_boss_rate: 1,
  boss_sunk_rate: 0,
  player_sunk_any_rate: 0,
})

/** A run that finishes when `release(index)` is called, or rejects when aborted. */
const controllable = () => {
  const pending = new Map<number, (d: SimulateDiag) => void>()
  const aborted: number[] = []
  let running = 0
  let peak = 0
  const run = (_route: unknown, index: number, signal: AbortSignal) =>
    new Promise<SimulateDiag>((resolve, reject) => {
      running++
      peak = Math.max(peak, running)
      const onAbort = () => {
        running--
        aborted.push(index)
        reject(new Cancelled())
      }
      pending.set(index, (d) => {
        running--
        signal.removeEventListener('abort', onAbort)
        resolve(d)
      })
      signal.addEventListener('abort', onAbort)
    })
  const release = async (index: number, d = diag(index / 10)) => {
    await new Promise((r) => setImmediate(r))
    pending.get(index)?.(d)
    await new Promise((r) => setImmediate(r))
  }
  return { run, release, aborted, peak: () => peak, started: () => [...pending.keys()] }
}

describe('simulateRoutes', () => {
  it('runs at most two at a time and reports each route as it finishes', async () => {
    const c = controllable()
    const done: number[] = []
    const promise = simulateRoutes({ routes: ['a', 'b', 'c'], run: c.run, onRouteDone: (i) => done.push(i) })
    await c.release(1)
    expect(done).toEqual([1])
    await c.release(0)
    await c.release(2)
    const results = await promise
    expect(c.peak()).toBe(2)
    expect(done).toEqual([1, 0, 2])
    expect(results.map((r) => r.ranks.S)).toEqual([0, 0.1, 0.2])
  })

  it('on cancel aborts every running process and returns no partial result', async () => {
    const c = controllable()
    const controller = new AbortController()
    const done: number[] = []
    const promise = simulateRoutes({ routes: ['a', 'b', 'c'], run: c.run, signal: controller.signal, onRouteDone: (i) => done.push(i) })
    await c.release(0)
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(Cancelled)
    expect(c.aborted.sort()).toEqual([1, 2])
    expect(done).toEqual([0])
  })

  it('stops the other routes when one fails, and rejects with that error', async () => {
    const failing = new SimError('OPTIMIZER_FAILED', 'boom')
    const aborted: number[] = []
    const promise = simulateRoutes({
      routes: ['a', 'b'],
      run: (_r, index, signal) =>
        index === 0
          ? Promise.reject(failing)
          : new Promise<SimulateDiag>((_res, rej) =>
              signal.addEventListener('abort', () => {
                aborted.push(index)
                rej(new Cancelled())
              }),
            ),
    })
    await expect(promise).rejects.toBe(failing)
    expect(aborted).toEqual([1])
  })

  it('with firstAlone, starts the others only after the first route finished', async () => {
    const c = controllable()
    const promise = simulateRoutes({ routes: ['a', 'b', 'c'], run: c.run, firstAlone: true })
    await new Promise((r) => setImmediate(r))
    expect(c.started()).toEqual([0])
    await c.release(0)
    expect(c.started().sort()).toEqual([0, 1, 2])
    await c.release(1)
    await c.release(2)
    expect((await promise).map((r) => r.ranks.S)).toEqual([0, 0.1, 0.2])
  })

  it('returns immediately for no routes', async () => {
    expect(await simulateRoutes({ routes: [], run: async () => diag(0) })).toEqual([])
  })
})
