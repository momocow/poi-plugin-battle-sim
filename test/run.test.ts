import { describe, expect, it } from 'vitest'

import { SimError } from '../src/errors'
import { Cancelled, runSimulate, simulateArgs } from '../src/optimizer/run'
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
    const { promise, children } = run('success')
    const diag = await promise
    expect(diag.ranks.S).toBeCloseTo(0.96045, 4)
    expect(diag.ranks_marginal.S).toBeCloseTo(0.56667, 4)
    expect(diag.reach_boss_rate).toBe(0.59)
    expect(diag.boss_sunk_rate).toBe(0.57)
    expect(children[0]?.stdinText()).toBe('[run]\ntrials = 10\n')
  })

  it('treats stderr warnings next to a result as success', async () => {
    const fixture = loadOptimizerFixture('success-with-warnings')
    expect(fixture.stderr).toContain('WARN')
    const diag = await run('success-with-warnings').promise
    expect(diag.reach_boss_rate).toBe(0.59)
  })

  it('fails with the error line message and its chain', async () => {
    const err = await failure(run('runtime-error').promise)
    expect(err.code).toBe('OPTIMIZER_FAILED')
    expect(err.message).toContain('unknown field `trialz`')
    expect(err.details.join('\n')).toContain('unknown field `trialz`')
  })

  it('fails with stderr text on a usage error (exit 2, no JSON)', async () => {
    const err = await failure(run('usage-error').promise)
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
