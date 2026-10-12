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
import { possibleSpecial, type ShipGateTable, type SpecialAttack } from '../fleet/specialGates'
import { allowedFormation, type Formation, type FormationReason, type NightBattle, type NodeFormation } from '../routes/formation'
import { AIR_RAID_COLOR } from '../routes/topology'
import type { ChoiceValues } from '../routes/choices'
import type { RouteCandidate } from '../routes/predict'

export type Phase = 'idle' | 'predicting' | 'simulating' | 'done' | 'error'

export interface RunInput {
  fleetId: number
  map: string
  choices: ChoiceValues
  trials: number
  /** The node a sortie ends at; undefined for the boss. */
  target?: string
  /** The user's formations for the map, by node letter; other battle nodes use their default. */
  formations: Record<string, Formation>
  /** The user's night battle settings for the map, by node letter; other nodes pursue it only as the target. */
  nightBattles: Record<string, NightBattle>
  /** Set while the fleet is on a sortie of `map`: the cells visited, the current one last. */
  sortie?: { cells: number[] }
}

/** A battle node's type: its default formation's reason, with an air raid told apart from an air battle. */
export type BattleType = FormationReason | 'airRaid'

/** What a route's simulation used at one battle node, for its tooltip. */
export interface NodeInfo {
  type: BattleType
  /** The formation fought in, after the ship-count rule. */
  formation: Formation
  /** The special attack that can fire there; null when none can. */
  special: SpecialAttack | null
}

export interface RouteRow extends RouteCandidate {
  /** Index in `nodes` of the first node simulated: the node the fleet is at mid-sortie, else 1 (after the start). */
  from?: number
  /** Set once this route's simulation finished; never set for routes that miss the target. */
  diag?: SimulateDiag
  /** Set with `diag`: each simulated battle node's info, by letter. */
  nodeInfo?: Record<string, NodeInfo>
}

export interface RunState {
  phase: Phase
  input?: RunInput
  snapshot?: FleetSnapshot
  /** Sorted by probability, highest first. */
  routes?: RouteRow[]
  devOptimizer?: boolean
  /** Waiting for this map's shared enemy-data fetch (first run); cleared when it ends. */
  fetchingEnemyData?: boolean
  /** Mid-sortie, when the sortie wasn't seen from its start: earlier special attacks are unknown. */
  sortieUnobserved?: boolean
  /** Whether the run pursues night battle at its target; set once the run has resolved its node settings. */
  nightBattleAtTarget?: boolean
  error?: SimError
}

export type RunAction =
  | { type: 'start'; input: RunInput; snapshot: FleetSnapshot }
  /** `routes` already sorted with `sortRoutes`; `routeDone` indexes refer to this order. */
  | {
      type: 'predicted'
      routes: RouteRow[]
      devOptimizer: boolean
      fetchingEnemyData?: boolean
      sortieUnobserved?: boolean
    }
  | { type: 'enemyDataReady' }
  | { type: 'nightBattleResolved'; atTarget: boolean }
  | { type: 'routeDone'; index: number; diag: SimulateDiag; nodeInfo?: Record<string, NodeInfo> }
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
        sortieUnobserved: action.sortieUnobserved,
        routes: action.routes,
      }
    case 'nightBattleResolved':
      return state.phase === 'simulating' ? { ...state, nightBattleAtTarget: action.atTarget } : state
    case 'enemyDataReady':
      return state.phase === 'simulating' ? { ...state, fetchingEnemyData: false } : state
    case 'routeDone': {
      if (state.phase !== 'simulating' || !state.routes) return state
      const routes = state.routes.map((r, i) => (i === action.index ? { ...r, diag: action.diag, nodeInfo: action.nodeInfo } : r))
      return { ...state, routes }
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

/** Whether a row is simulated: it reaches the target, and the fleet is not past it. */
export const isSimulated = (r: RouteRow): boolean => r.reachesTarget && !r.passedTarget

/** Indexes (into `routes`) of the rows that are simulated. */
export const targetRouteIndexes = (routes: RouteRow[]): number[] =>
  routes.flatMap((r, i) => (isSimulated(r) ? [i] : []))

export function progress(state: RunState): { finished: number; total: number } {
  const simulated = (state.routes ?? []).filter(isSimulated)
  return { finished: simulated.filter((r) => r.diag).length, total: simulated.length }
}

/**
 * The tooltip info for a route's simulated battle nodes: its type, the formation after the ship-count rule, and the
 * special attack that can fire there. Nodes without a known formation, as when the map's topology isn't cached, are left out.
 */
export function routeNodeInfo(
  input: {
    nodes: string[]
    formations: Record<string, NodeFormation>
    /** The map's node colours, as voted from its topology. */
    colors: Map<string, number>
    /** Whether the route pursues night battle at each node, as sent to the optimizer. */
    nightBattles: Record<string, boolean>
    snapshot: FleetSnapshot
    /** Special attacks fired earlier in the sortie, when known. */
    fired: number[]
  },
  shipGates: ShipGateTable,
): Record<string, NodeInfo> {
  const shipIds = input.snapshot.ships.map((ship) => ship.shipId)
  return Object.fromEntries(
    input.nodes
      .filter((node) => node in input.formations)
      .map((node) => {
        const formation = allowedFormation(input.formations[node]!.formation, shipIds.length)
        const night = input.nightBattles[node] === true
        const { reason } = input.formations[node]!
        return [
          node,
          {
            type: reason === 'air' && input.colors.get(node) === AIR_RAID_COLOR ? 'airRaid' : reason,
            formation,
            special: possibleSpecial({ shipIds, formation, night, fired: input.fired }, shipGates),
          },
        ]
      }),
  )
}
