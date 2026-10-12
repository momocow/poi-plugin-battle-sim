/**
 * What the route cards, the summary and the result footer show, as plain values.
 *
 * Per-route cells count all of that route's trials, so each value weighted
 * by the route's probability adds up to the summary's value; the "when
 * reached" values sit next to them and are not weighted. A and B are each
 * rank on its own or cumulative, as the rank display setting says. Every rate
 * is at the run's target: the boss, or the node the routes were cut at.
 */
import type { Loadout } from '../fleet/snapshot'
import type { SpecialAttack } from '../fleet/specialGates'
import { t } from '../i18n'
import { aggregate, aOrBetter, bOrBetter, type Aggregate } from '../optimizer/aggregate'
import type { RankRates, SimulateDiag } from '../optimizer/run'
import type { Formation } from '../routes/formation'
import type { RankDisplay } from './inputs'
import { isSimulated, type BattleType, type NodeInfo, type RouteRow, type RunInput } from './state'

/** Formation names, as i18n keys. */
export const FORMATION_NAMES: Record<Formation, string> = {
  LineAhead: 'Line ahead',
  DoubleLine: 'Double line',
  Diamond: 'Diamond',
  Echelon: 'Echelon',
  LineAbreast: 'Line abreast',
  Vanguard: 'Vanguard',
}

/** Battle node types, as i18n keys; the first five are the default formation's reasons. */
export const BATTLE_TYPE_NAMES: Record<BattleType, string> = {
  submarines: 'Submarines only',
  submarinesMixed: 'Submarines mixed',
  night: 'Night battle',
  air: 'Air battle',
  normal: 'Normal battle',
  airRaid: 'Air raid',
}

/** Types of a node without a battle, by the optimizer's kind, as i18n keys; any kind but a maelstrom is a pass-through. */
const NO_BATTLE_TYPE_NAMES = {
  maelstrom: 'Maelstrom',
  pass: 'No battle',
}

/** Special-attack names, as i18n keys. */
export const SPECIAL_NAMES: Record<SpecialAttack, string> = {
  100: 'Nelson Touch',
  101: 'Nagato cutin',
  102: 'Mutsu cutin',
  103: 'Colorado special attack',
  104: 'Kongou-class night special attack',
  105: 'Richelieu special attack',
  106: 'Warspite special attack',
  400: 'Yamato-class 3-ship special attack',
  401: 'Yamato-class 2-ship special attack',
}

/** `['1','A','B','C2','D']` → `A-B-C2-D`, plus `[Boss]` when the last node is the boss. */
export function formatRoute(nodes: string[], endsAtBoss: boolean): string {
  const text = nodes.slice(1).join('-')
  return endsAtBoss ? `${text}[Boss]` : text
}

/** The labels that name the run's target: "boss" for the boss (undefined), else the node's letter. */
export function targetLabels(target: string | undefined): {
  reach: string
  sunk: string
  whenReached: string
  notSimulated: string
} {
  return target === undefined
    ? {
        reach: t('Reach boss'),
        sunk: t('Boss sunk'),
        whenReached: t('When the boss is reached'),
        notSimulated: t('Not simulated (does not reach the boss)'),
      }
    : {
        reach: t('Reach {node}', { node: target }),
        sunk: t('{node} flagship sunk', { node: target }),
        whenReached: t('When {node} is reached', { node: target }),
        notSimulated: t('Not simulated (does not reach {node})', { node: target }),
      }
}

/** Mid-sortie, the node the fleet was at: the first node simulated. */
export function atNode(routes: RouteRow[] | undefined): string | undefined {
  const row = routes?.find((r) => r.from !== undefined)
  return row ? row.nodes[row.from!] : undefined
}

/** One decimal place; undefined (no trial reached the target) shows as "—". */
export const pct = (x: number | undefined): string => (x === undefined ? '—' : `${(x * 100).toFixed(1)}%`)

export interface RateCells {
  reachTarget: number
  s: number
  /** A, or A or better when the rank display is cumulative. */
  a: number
  /** B, or B or better when the rank display is cumulative. */
  b: number
  targetSunk: number
  /** Among trials that reached the target; undefined when none did. */
  sAtTarget: number | undefined
  aAtTarget: number | undefined
  bAtTarget: number | undefined
  targetSunkAtTarget: number | undefined
}

/** The summary's cells: past the target mid-sortie, the per-sortie rank and sunk values are unknown too. */
export type SummaryCells = Omit<RateCells, 's' | 'a' | 'b' | 'targetSunk'> & {
  s: number | undefined
  a: number | undefined
  b: number | undefined
  targetSunk: number | undefined
}

export type RowCells =
  | { kind: 'not-simulated' }
  /** Mid-sortie, the fleet is past the target: reached, its battle over. */
  | { kind: 'passed' }
  | { kind: 'pending' }
  | ({ kind: 'done' } & RateCells)

/** A and B from one set of rank rates, on their own or cumulative. */
const rankPair = (r: RankRates, mode: RankDisplay): [number, number] =>
  mode === 'cumulative' ? [aOrBetter(r), bOrBetter(r)] : [r.A, r.B]

/** S, then A and B as the rank display says, labeled as on the cards; undefined values show as "—". */
export function rankCells(r: RankRates | undefined, mode: RankDisplay): { label: string; value: number | undefined }[] {
  const plus = mode === 'cumulative' ? '+' : ''
  const [a, b] = r ? rankPair(r, mode) : []
  return [
    { label: 'S', value: r?.S },
    { label: `A${plus}`, value: a },
    { label: `B${plus}`, value: b },
  ]
}

export interface NodeTooltip {
  /** Share of the route's trials that reached the node. */
  reach: number
  /** False for a resource, empty or maelstrom node, which shows only its type and reach. */
  battle: boolean
  /** The node's type, as an i18n key; undefined for a battle node the run knew no formation for. */
  type?: string
  /** Undefined when the run knew no formation for the node (no topology cached). */
  info?: NodeInfo
  /** Among trials that fought there; undefined when none did. */
  ranks?: RankRates
}

/**
 * The tooltip of the stepper's node `index` (start excluded) on a finished route; undefined for a node passed
 * mid-sortie or a route without a result.
 */
export function nodeTooltip(row: RouteRow, index: number): NodeTooltip | undefined {
  const d = row.diag
  const i = index + 1 - (row.from ?? 1)
  const meta = d?.route[i]
  if (!d || i < 0 || !meta) return undefined
  const reach = routeReach(d)[i]!.rate
  if (meta.battleIndex === null) return { reach, battle: false, type: NO_BATTLE_TYPE_NAMES[meta.kind === 'maelstrom' ? 'maelstrom' : 'pass'] }
  const info = row.nodeInfo?.[meta.node]
  return {
    reach,
    battle: true,
    type: info && BATTLE_TYPE_NAMES[info.type],
    info,
    ranks: d.ranks_per_node?.[meta.battleIndex] ?? undefined,
  }
}

export function rowCells(row: RouteRow, mode: RankDisplay): RowCells {
  if (row.passedTarget) return { kind: 'passed' }
  if (!row.reachesTarget) return { kind: 'not-simulated' }
  if (!row.diag) return { kind: 'pending' }
  const d = row.diag
  const reached = d.reach_boss_rate > 0
  const [a, b] = rankPair(d.ranks_marginal, mode)
  const [aAtTarget, bAtTarget] = reached ? rankPair(d.ranks, mode) : []
  return {
    kind: 'done',
    reachTarget: d.reach_boss_rate,
    s: d.ranks_marginal.S,
    a,
    b,
    targetSunk: d.boss_sunk_rate,
    sAtTarget: reached ? d.ranks.S : undefined,
    aAtTarget,
    bAtTarget,
    targetSunkAtTarget: reached ? d.boss_sunk_rate / d.reach_boss_rate : undefined,
  }
}

/**
 * The summary, once every simulated route has a result; undefined before that. Past the target mid-sortie,
 * every route has reached it and nothing is simulated, so only the reach rate is known.
 */
export function summaryCells(routes: RouteRow[], mode: RankDisplay): SummaryCells | undefined {
  if (routes.some((r) => isSimulated(r) && !r.diag)) return undefined
  if (routes.some((r) => r.passedTarget)) {
    const reachTarget = routes.filter((r) => r.passedTarget).reduce((sum, r) => sum + r.probability, 0)
    return {
      reachTarget,
      s: undefined,
      a: undefined,
      b: undefined,
      targetSunk: undefined,
      sAtTarget: undefined,
      aAtTarget: undefined,
      bAtTarget: undefined,
      targetSunkAtTarget: undefined,
    }
  }
  const all: Aggregate = aggregate(routes.map((r) => ({ probability: r.probability, diag: r.diag })))
  const [a, b] = rankPair(all.ranks, mode)
  const [aAtTarget, bAtTarget] = all.ranksAtBoss ? rankPair(all.ranksAtBoss, mode) : []
  return {
    reachTarget: all.reachBoss,
    s: all.ranks.S,
    a,
    b,
    targetSunk: all.bossSunk,
    sAtTarget: all.ranksAtBoss?.S,
    aAtTarget,
    bAtTarget,
    targetSunkAtTarget: all.reachBoss > 0 ? all.bossSunk / all.reachBoss : undefined,
  }
}

export interface NodeRate {
  node: string
  rate: number
}

/**
 * Share of all trials reaching each route node, start excluded. The
 * optimizer's rates cover battle nodes only; a node without a battle takes the
 * next node's rate, since a fleet only turns back after a battle. Walking
 * backwards from the target gives that in one pass.
 */
export function routeReach(diag: SimulateDiag): NodeRate[] {
  const out: NodeRate[] = new Array(diag.route.length)
  let next = diag.reach_boss_rate
  for (let i = diag.route.length - 1; i >= 0; i--) {
    const { node, battleIndex } = diag.route[i]!
    next = battleIndex === null ? next : diag.per_node_reach[battleIndex]!
    out[i] = { node, rate: next }
  }
  return out
}

/**
 * Where trials turned back: each node's reach minus the next node's, in route
 * order, leaving out drops that would show as 0.0%.
 */
export const retreats = (reach: NodeRate[]): NodeRate[] =>
  reach.flatMap(({ node, rate }, i) => {
    const drop = i + 1 < reach.length ? rate - reach[i + 1]!.rate : 0
    return Math.round(drop * 1000) >= 1 ? [{ node, rate: drop }] : []
  })

/** The worst-case (p = 0.5) 95% interval of one route's rate, as a fraction: 0.98 / √trials. */
export const marginOfError = (trials: number): number => 0.98 / Math.sqrt(trials)

/**
 * Whether Auto is on but held back by the fleet: loaded, with ships, and one of them has an empty main slot. Not
 * before the game data loads, with no fleet selected, or for an empty fleet.
 */
export function isAutoPaused(auto: boolean, loadout: Loadout | undefined, shipCount: number | undefined): boolean {
  return auto && loadout !== undefined && !loadout.complete && (shipCount ?? 0) > 0
}

/**
 * Whether `current` would run something other than `run`: another fleet, map, trial count, choice, target,
 * formation or night battle setting, or the sortie moved on or ended.
 */
export function isStale(run: RunInput, current: RunInput): boolean {
  if (run.fleetId !== current.fleetId || run.map !== current.map || run.trials !== current.trials) return true
  if (run.target !== current.target) return true
  if (String(run.sortie?.cells) !== String(current.sortie?.cells)) return true
  return (
    differ(run.choices, current.choices) ||
    differ(run.formations, current.formations) ||
    differ(run.nightBattles, current.nightBattles)
  )
}

/** Whether two records differ in any key. */
function differ(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].some((k) => a[k] !== b[k])
}

/**
 * A finished route's S, A-or-better and B-or-better rates weighted by its probability: its share of the summary.
 * Whatever the rank display, since comparing these in turn orders routes the same as comparing S, A and B.
 */
function weightedRanks(row: RouteRow): [number, number, number] {
  const d = row.diag
  if (!d) return [0, 0, 0]
  const p = row.probability
  return [p * d.ranks_marginal.S, p * aOrBetter(d.ranks_marginal), p * bOrBetter(d.ranks_marginal)]
}

/**
 * Card order, most promising first: finished routes by weighted S, then
 * weighted A or better, then weighted B or better, all highest first; then
 * routes still simulating; then routes that do not reach the target. Ties, and
 * the order within the last two groups, go by probability, highest first.
 */
export function sortForCards(routes: RouteRow[]): RouteRow[] {
  const group = (r: RouteRow) => (r.diag ? 0 : r.reachesTarget ? 1 : 2)
  return [...routes].sort((a, b) => {
    const [wa, wb] = [weightedRanks(a), weightedRanks(b)]
    return (
      group(a) - group(b) ||
      wb[0] - wa[0] ||
      wb[1] - wa[1] ||
      wb[2] - wa[2] ||
      b.probability - a.probability
    )
  })
}
