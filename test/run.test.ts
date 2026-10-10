import { describe, expect, it } from 'vitest'

import { SimError } from '../src/errors'
import { Cancelled, checkRoute, interpretOutput, runSimulate, simulateArgs } from '../src/optimizer/run'
import { fakeSpawn, loadOptimizerFixture, tempDir } from './helpers'

const run = (name: string) => {
  const { spawn, children } = fakeSpawn(loadOptimizerFixture(name))
  const promise = runSimulate({
    binPath: '/opt/optimizer',
    dataDir: '/opt/data',
    workDir: tempDir(),
    logName: 'route-0.log',
    toml: '[run]\ntrials = 10\n',
    spawn,
  })
  return { promise, children }
}

const failure = async (p: Promise<unknown>): Promise<SimError> => {
  const err = await p.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(SimError)
  return err as SimError
}

describe('runSimulate', () => {
  it('returns the diag of a successful run and writes the TOML to stdin', async () => {
    const { promise, children } = run('recorded-0.2.1/success')
    const diag = await promise
    expect(diag.ranks.S).toBeCloseTo(0.97368, 4)
    expect(diag.ranks_marginal.S).toBe(0.74)
    expect(diag.reach_boss_rate).toBe(0.76)
    expect(diag.boss_sunk_rate).toBeCloseTo(0.74333, 4)
    expect(diag.per_node_reach).toEqual([1.0, 0.9733333333333334, 0.8433333333333334, 0.76])
    expect(diag.route).toEqual([
      { node: 'B', battleIndex: null },
      { node: 'C', battleIndex: 0 },
      { node: 'E', battleIndex: 1 },
      { node: 'F', battleIndex: 2 },
      { node: 'O', battleIndex: 3 },
    ])
    expect(children[0]?.stdinText()).toBe('[run]\ntrials = 10\n')
  })

  it('reads a route through an empty node (2-3 B-E-F-J-N)', async () => {
    const diag = await run('recorded-0.2.1/pass-through-2-3').promise
    expect(diag.route.map((n) => n.node)).toEqual(['B', 'E', 'F', 'J', 'N'])
    expect(diag.route[0]?.battleIndex).toBeNull()
    expect(diag.per_node_reach).toHaveLength(4)
  })

  it('treats stderr warnings next to a result as success', async () => {
    const fixture = loadOptimizerFixture('recorded-0.2.1/success')
    expect(fixture.stderr).toContain('INFO')
    const diag = await run('recorded-0.2.1/success').promise
    expect(diag.reach_boss_rate).toBe(0.76)
  })

  it('fails as incompatible on a 0.2.0 result without a route description', async () => {
    const err = await failure(run('recorded-0.2.0/success-with-warnings').promise)
    expect(err.code).toBe('OPTIMIZER_SCHEMA')
    expect(err.details.join('\n')).toContain('_meta.route')
  })

  it('fails with the error line message and its chain', async () => {
    const err = await failure(run('recorded-0.2.0/runtime-error').promise)
    expect(err.code).toBe('OPTIMIZER_FAILED')
    expect(err.message).toContain('unknown field `trialz`')
    expect(err.details.join('\n')).toContain('unknown field `trialz`')
  })

  it('fails with stderr text on a usage error (exit 2, no JSON)', async () => {
    const err = await failure(run('recorded-0.2.0/usage-error').promise)
    expect(err.code).toBe('OPTIMIZER_FAILED')
    expect(err.message).toBe("error: unexpected argument '--bogus' found")
    expect(err.details.join('\n')).toContain('Usage:')
  })

  it('fails when no terminal line arrives', async () => {
    const err = await failure(run('missing-terminal').promise)
    expect(err.code).toBe('OPTIMIZER_FAILED')
    expect(err.message).toMatch(/without a result/)
  })

  it('fails as incompatible on an unknown schema', async () => {
    const err = await failure(run('unknown-schema').promise)
    expect(err.code).toBe('OPTIMIZER_SCHEMA')
  })

  describe('result validation', () => {
    const resultLine = (diag: Record<string, unknown>) => {
      const ranks = { S: 1, A: 0, B: 0, C: 0, D: 0, E: 0 }
      const line = {
        type: 'result',
        schema: 1,
        diag: { ranks, ranks_marginal: ranks, reach_boss_rate: 1, boss_sunk_rate: 1, ...diag },
      }
      return JSON.stringify(line)
    }
    const schemaError = (diag: Record<string, unknown>): SimError => {
      try {
        interpretOutput(resultLine(diag), '', 0)
      } catch (err) {
        expect(err).toBeInstanceOf(SimError)
        expect((err as SimError).code).toBe('OPTIMIZER_SCHEMA')
        return err as SimError
      }
      throw new Error('expected a schema error')
    }
    const route = [{ node: 'A', kind: 'battle', battle_index: 0 }]

    it('accepts a complete result', () => {
      const diag = interpretOutput(resultLine({ per_node_reach: [1], _meta: { route } }), '', 0)
      expect(diag.route).toEqual([{ node: 'A', battleIndex: 0 }])
    })

    it('requires per-node reach rates', () => {
      expect(schemaError({ _meta: { route } }).details.join('\n')).toContain('per_node_reach')
    })

    it('requires the route description', () => {
      expect(schemaError({ per_node_reach: [1] }).details.join('\n')).toContain('_meta.route')
    })

    it('rejects a battle index past the per-node rates', () => {
      schemaError({ per_node_reach: [1], _meta: { route: [{ node: 'A', kind: 'battle', battle_index: 1 }] } })
    })

    it('rejects an entry without a node letter', () => {
      schemaError({ per_node_reach: [1], _meta: { route: [{ node: null, kind: 'battle', battle_index: 0 }] } })
    })
  })

  it('checks that the result route is the requested one', async () => {
    const diag = await run('recorded-0.2.1/success').promise
    expect(checkRoute(diag, ['B', 'C', 'E', 'F', 'O'])).toBe(diag)
    for (const nodes of [['B', 'C', 'E', 'F'], ['B', 'D', 'E', 'F', 'O']]) {
      expect(() => checkRoute(diag, nodes)).toThrow(
        expect.objectContaining({ code: 'OPTIMIZER_SCHEMA' }) as unknown as Error,
      )
    }
  })

  it('kills the process and rejects with Cancelled on abort', async () => {
    const { spawn, children } = fakeSpawn()
    const controller = new AbortController()
    const promise = runSimulate({
      binPath: '/opt/optimizer',
      dataDir: '/opt/data',
      workDir: tempDir(),
      logName: 'route-0.log',
      toml: '',
      spawn,
      signal: controller.signal,
    })
    await new Promise((r) => setTimeout(r, 10))
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(Cancelled)
    expect(children[0]?.killed).toBe(true)
  })

  it('passes absolute data, kcnav and log paths', () => {
    const args = simulateArgs({ dataDir: '/opt/data', workDir: '/app/battle-sim', logName: 'route-1.log' })
    expect(args.slice(0, 4)).toEqual(['simulate', '--config', '-', '--json'])
    expect(args).toContain('/opt/data')
    expect(args[args.indexOf('--kcnav-dir') + 1]).toMatch(/^\/app\/battle-sim[\\/]kcnav$/)
    expect(args[args.indexOf('--log-file') + 1]).toMatch(/logs[\\/]route-1\.log$/)
  })
})
