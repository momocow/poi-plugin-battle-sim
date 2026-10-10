/**
 * The panel's run state: idle → predicting → simulating → done, or error.
 *
 * Simulation starts as soon as prediction succeeds; there is no confirmation
 * step. Cancelling returns to idle with nothing kept. From the start of a run
 * the state holds the captured snapshot, so the fleet display stops following
 * the live store until the next run or a cancel.
 */
import type { SimError } from '../errors'
import type { FleetSnapshot } from '../fleet/types'
import type { SimulateDiag } from '../optimizer/run'
import type { ChoiceValues } from '../routes/choices'
import type { RouteCandidate } from '../routes/predict'

export type Phase = 'idle' | 'predicting' | 'simulating' | 'done' | 'error'

export interface RunInput {
  fleetId: number
  map: string
  choices: ChoiceValues
  trials: number
}

export interface RouteRow extends RouteCandidate {
  /** Set once this route's simulation finished; never set for non-boss routes. */
  diag?: SimulateDiag
}

export interface RunState {
  phase: Phase
  input?: RunInput
  snapshot?: FleetSnapshot
  /** Sorted by probability, highest first. */
  routes?: RouteRow[]
  devOptimizer?: boolean
  /** The optimizer is fetching this map's enemy data (first run); cleared when a route finishes. */
  fetchingEnemyData?: boolean
  error?: SimError
}

export type RunAction =
  | { type: 'start'; input: RunInput; snapshot: FleetSnapshot }
  /** `routes` already sorted with `sortRoutes`; `routeDone` indexes refer to this order. */
  | { type: 'predicted'; routes: RouteCandidate[]; devOptimizer: boolean; fetchingEnemyData?: boolean }
  | { type: 'routeDone'; index: number; diag: SimulateDiag }
  | { type: 'finished' }
  | { type: 'failed'; error: SimError; input?: RunInput }
  | { type: 'cancelled' }

/** Highest probability first: the table order. */
export const sortRoutes = <T extends RouteCandidate>(routes: T[]): T[] =>
  [...routes].sort((a, b) => b.probability - a.probability)

export const initialRunState: RunState = { phase: 'idle' }

export const isRunning = (s: RunState): boolean => s.phase === 'predicting' || s.phase === 'simulating'

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'start':
      return { phase: 'predicting', input: action.input, snapshot: action.snapshot }
    case 'predicted':
      if (state.phase !== 'predicting') return state
      return {
        ...state,
        phase: 'simulating',
        devOptimizer: action.devOptimizer,
        fetchingEnemyData: action.fetchingEnemyData ?? false,
        routes: action.routes,
      }
    case 'routeDone': {
      if (state.phase !== 'simulating' || !state.routes) return state
      const routes = state.routes.map((r, i) => (i === action.index ? { ...r, diag: action.diag } : r))
      return { ...state, routes, fetchingEnemyData: false }
    }
    case 'finished':
      return state.phase === 'simulating' ? { ...state, phase: 'done' } : state
    case 'failed':
      // Rejected before starting (e.g. an empty fleet): nothing of an earlier run is kept.
      if (!isRunning(state)) return { phase: 'error', error: action.error, input: action.input }
      return { ...state, phase: 'error', error: action.error, input: action.input ?? state.input, routes: undefined }
    case 'cancelled':
      return initialRunState
  }
}

/** Indexes (into `routes`) of the rows that are simulated: those reaching the boss. */
export const bossRouteIndexes = (routes: RouteRow[]): number[] =>
  routes.flatMap((r, i) => (r.reachesBoss ? [i] : []))

export function progress(state: RunState): { finished: number; total: number } {
  const boss = (state.routes ?? []).filter((r) => r.reachesBoss)
  return { finished: boss.filter((r) => r.diag).length, total: boss.length }
}
