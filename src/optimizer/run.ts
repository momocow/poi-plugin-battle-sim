/**
 * One `simulate --config - --json` process.
 *
 * The contract: TOML on stdin; on stdout one JSON object per line — `start`,
 * then exactly one terminal `result` or `error` — each carrying `type` and
 * `schema`. Exit 0 means a result was emitted, 1 a runtime error with an
 * `error` line, 2 a usage error reported on stderr only. stderr text alone is
 * never a failure (the optimizer logs warnings there).
 */
import { spawn as nodeSpawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { SimError } from '../errors'

export const SUPPORTED_SCHEMA = 1

export const RANKS = ['S', 'A', 'B', 'C', 'D', 'E'] as const
export type Rank = (typeof RANKS)[number]
export type RankRates = Record<Rank, number>

/** The subset of the optimizer's simulate diag this plugin reads. */
export interface SimulateDiag {
  /** Among trials that reached the boss. */
  ranks: RankRates
  /** Among all trials. */
  ranks_marginal: RankRates
  reach_boss_rate: number
  boss_sunk_rate: number
  player_sunk_any_rate: number
}

/** Raised when the caller's AbortSignal fires; never shown as an error. */
export class Cancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'Cancelled'
  }
}

/** The part of a ChildProcess this module uses, so tests can pass a fake. */
export interface ChildLike {
  stdin: NodeJS.WritableStream & { on(event: 'error', cb: (err: Error) => void): unknown }
  stdout: NodeJS.ReadableStream
  stderr: NodeJS.ReadableStream
  on(event: 'error', cb: (err: Error) => void): unknown
  on(event: 'close', cb: (code: number | null) => void): unknown
  kill(): unknown
}

export type SpawnFn = (bin: string, args: string[], opts: { cwd: string }) => ChildLike

export interface RunOptions {
  binPath: string
  /** Bundled game data, read-only. */
  dataDir: string
  /** `<APPDATA_PATH>/battle-sim`: cwd, kcnav cache and logs live here. */
  workDir: string
  /** Log file name under `<workDir>/logs`, distinct per concurrent process. */
  logName: string
  toml: string
  signal?: AbortSignal
  spawn?: SpawnFn
}

const defaultSpawn: SpawnFn = (bin, args, opts) =>
  nodeSpawn(bin, args, { cwd: opts.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })

/** The optimizer's kcnav cache: in poi's app data, so it survives plugin updates. */
export const kcnavDir = (workDir: string): string => join(workDir, 'kcnav')

export function simulateArgs(opts: Pick<RunOptions, 'dataDir' | 'workDir' | 'logName'>): string[] {
  return [
    'simulate',
    '--config',
    '-',
    '--json',
    '--data-dir',
    opts.dataDir,
    '--kcnav-dir',
    kcnavDir(opts.workDir),
    '--log-file',
    join(opts.workDir, 'logs', opts.logName),
  ]
}

export async function runSimulate(opts: RunOptions): Promise<SimulateDiag> {
  if (opts.signal?.aborted) throw new Cancelled()
  await mkdir(kcnavDir(opts.workDir), { recursive: true })
  await mkdir(join(opts.workDir, 'logs'), { recursive: true })
  if (opts.signal?.aborted) throw new Cancelled()

  const child = (opts.spawn ?? defaultSpawn)(opts.binPath, simulateArgs(opts), { cwd: opts.workDir })

  return new Promise<SimulateDiag>((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      opts.signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const onAbort = () => {
      child.kill()
      finish(() => reject(new Cancelled()))
    }
    opts.signal?.addEventListener('abort', onAbort)

    child.stdout.on('data', (chunk: Buffer | string) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer | string) => (stderr += chunk.toString()))
    // The process may exit before reading stdin (e.g. a usage error); the exit code says why.
    child.stdin.on('error', () => undefined)
    child.on('error', (err) =>
      finish(() =>
        reject(new SimError('OPTIMIZER_FAILED', 'The optimizer could not be started.', [String(err)])),
      ),
    )
    child.on('close', (code) => {
      finish(() => {
        try {
          resolve(interpretOutput(stdout, stderr, code))
        } catch (err) {
          reject(err)
        }
      })
    })

    child.stdin.end(opts.toml)
  })
}

type Line = { type?: unknown; schema?: unknown; [key: string]: unknown }

/** Apply the terminal-line, exit-code and schema rules to a finished process. */
export function interpretOutput(stdout: string, stderr: string, exitCode: number | null): SimulateDiag {
  const stderrDetails = stderr.trim() ? [`stderr:\n${stderr.trim()}`] : []
  const lines: Line[] = []
  for (const raw of stdout.split(/\r?\n/)) {
    if (!raw.trim()) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new SimError('OPTIMIZER_FAILED', 'The optimizer printed output that is not JSON.', [
        raw,
        ...stderrDetails,
      ])
    }
    if (parsed === null || typeof parsed !== 'object') {
      throw new SimError('OPTIMIZER_FAILED', 'The optimizer printed output that is not a JSON object.', [raw])
    }
    lines.push(parsed as Line)
  }

  const unsupported = lines.find((line) => line.schema !== SUPPORTED_SCHEMA)
  if (unsupported) {
    throw new SimError(
      'OPTIMIZER_SCHEMA',
      'The optimizer version is incompatible with this plugin.',
      [`output schema ${String(unsupported.schema)}, supported ${SUPPORTED_SCHEMA}`],
    )
  }

  const errorLine = lines.find((line) => line.type === 'error')
  if (errorLine) {
    const message = typeof errorLine.message === 'string' ? errorLine.message : 'The optimizer reported an error.'
    const chain = Array.isArray(errorLine.chain) ? errorLine.chain.map(String) : []
    throw new SimError('OPTIMIZER_FAILED', message, [...chain, ...stderrDetails])
  }

  if (exitCode !== 0) {
    const text = stderr.trim()
    throw new SimError(
      'OPTIMIZER_FAILED',
      text ? (text.split(/\r?\n/)[0] ?? text) : `The optimizer exited with code ${String(exitCode)}.`,
      [`exit code ${String(exitCode)}`, ...stderrDetails],
    )
  }

  const results = lines.filter((line) => line.type === 'result')
  if (results.length !== 1) {
    throw new SimError(
      'OPTIMIZER_FAILED',
      results.length === 0
        ? 'The optimizer finished without a result.'
        : 'The optimizer emitted more than one result.',
      stderrDetails,
    )
  }
  return readDiag(results[0]?.diag)
}

function readDiag(diag: unknown): SimulateDiag {
  const d = (diag ?? {}) as Record<string, unknown>
  const missing: string[] = []
  const num = (key: string): number => {
    const v = d[key]
    if (typeof v !== 'number') missing.push(key)
    return typeof v === 'number' ? v : 0
  }
  const ranks = (key: string): RankRates => {
    const v = (d[key] ?? undefined) as Record<string, unknown> | undefined
    if (!v || typeof v !== 'object') missing.push(key)
    return Object.fromEntries(
      RANKS.map((r) => [r, typeof v?.[r] === 'number' ? (v[r] as number) : 0]),
    ) as RankRates
  }
  const result: SimulateDiag = {
    ranks: ranks('ranks'),
    ranks_marginal: ranks('ranks_marginal'),
    reach_boss_rate: num('reach_boss_rate'),
    boss_sunk_rate: num('boss_sunk_rate'),
    player_sunk_any_rate: num('player_sunk_any_rate'),
  }
  if (missing.length > 0) {
    throw new SimError('OPTIMIZER_SCHEMA', 'The optimizer version is incompatible with this plugin.', [
      `result is missing: ${missing.join(', ')}`,
    ])
  }
  return result
}
