import { EventEmitter } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import type { ChildLike, SpawnFn } from '../src/optimizer/run'

export interface ProcessFixture {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * A recorded case such as `recorded-0.2.1/success` under `fixtures/optimizer`,
 * or a hand-written `<name>.json` there.
 */
export function loadOptimizerFixture(name: string): ProcessFixture {
  const dir = join(__dirname, 'fixtures', 'optimizer')
  const recorded = join(dir, name)
  if (existsSync(`${recorded}.exit`)) {
    return {
      exitCode: Number(readFileSync(`${recorded}.exit`, 'utf8').trim()),
      stdout: readFileSync(`${recorded}.stdout.ndjson`, 'utf8'),
      stderr: readFileSync(`${recorded}.stderr.txt`, 'utf8'),
    }
  }
  return JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'))
}

export function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'battle-sim-test-'))
}

export interface FakeChild extends ChildLike {
  stdinText: () => string
  killed: boolean
  args: string[]
}

/**
 * A child process that replays a fixture once its stdin is closed, or — with
 * `fixture` undefined — runs until killed.
 */
export function fakeSpawn(fixture?: ProcessFixture): { spawn: SpawnFn; children: FakeChild[] } {
  const children: FakeChild[] = []
  const spawn: SpawnFn = (_bin, args) => {
    const emitter = new EventEmitter()
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    let input = ''
    stdin.on('data', (c) => (input += c.toString()))
    const child = Object.assign(emitter, {
      stdin,
      stdout,
      stderr,
      killed: false,
      args,
      stdinText: () => input,
      kill() {
        child.killed = true
        setImmediate(() => emitter.emit('close', null))
      },
    }) as unknown as FakeChild
    if (fixture) {
      stdin.on('finish', () => {
        stdout.end(fixture.stdout)
        stderr.end(fixture.stderr)
        setImmediate(() => emitter.emit('close', fixture.exitCode))
      })
    }
    children.push(child)
    return child
  }
  return { spawn, children }
}

export function loadStore(): import('../src/fleet/types').PoiState {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', 'store.json'), 'utf8'))
}
