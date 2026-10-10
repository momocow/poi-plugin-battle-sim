/**
 * Run one optimizer process per boss route, at most `concurrency` at a time.
 *
 * Each finished route is reported as it lands so the table fills in per
 * route. Cancelling (the caller's signal) or any route failing aborts every
 * process still running; the promise then rejects and no partial result is
 * returned.
 */
import { Cancelled, type SimulateDiag } from './run'

export const MAX_CONCURRENT = 2

export interface OrchestrateOptions<R> {
  routes: R[]
  run: (route: R, index: number, signal: AbortSignal) => Promise<SimulateDiag>
  signal?: AbortSignal
  concurrency?: number
  onRouteDone?: (index: number, diag: SimulateDiag) => void
}

export async function simulateRoutes<R>(opts: OrchestrateOptions<R>): Promise<SimulateDiag[]> {
  const inner = new AbortController()
  const onOuterAbort = () => inner.abort()
  if (opts.signal?.aborted) throw new Cancelled()
  opts.signal?.addEventListener('abort', onOuterAbort)

  const results: SimulateDiag[] = new Array(opts.routes.length)
  let next = 0
  let firstError: unknown

  const worker = async () => {
    while (next < opts.routes.length && !inner.signal.aborted) {
      const index = next++
      try {
        const diag = await opts.run(opts.routes[index] as R, index, inner.signal)
        if (inner.signal.aborted) return
        results[index] = diag
        opts.onRouteDone?.(index, diag)
      } catch (err) {
        if (firstError === undefined) firstError = err
        inner.abort()
        return
      }
    }
  }

  try {
    const width = Math.max(1, Math.min(opts.concurrency ?? MAX_CONCURRENT, opts.routes.length))
    await Promise.all(Array.from({ length: width }, () => worker()))
  } finally {
    opts.signal?.removeEventListener('abort', onOuterAbort)
  }

  if (opts.signal?.aborted) throw new Cancelled()
  if (firstError !== undefined) throw firstError
  return results
}
