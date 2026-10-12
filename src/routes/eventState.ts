/**
 * The event state a run on an event map simulates: difficulty (1 丁 … 4 甲),
 * gauge number, and gauge state (chip, last dance, or cleared). It decides
 * which kcnav variant of the map's enemy data is read and fetched.
 *
 * Each value is the game's (poi's `info.maps`), unless the user overrides it
 * for the map; mid-sortie only the game's count, since the sortie is at the
 * state the game is in. Chip and last dance are told apart by the gauge's
 * last-dance threshold from the game-data package; without one, the state is
 * unknown and no HP band is sent, so chip and last dance read the same data.
 *
 * The variant name copies the optimizer's (`src/data/kcnav/key.rs`,
 * `CacheKey::variant`): `d{difficulty}-g{gauge}-c{cleared}-L{min}_{max}`,
 * `x` for a dimension not given and `Lx` for no HP band. A cleared map has
 * no gauge or HP band (the optimizer rejects them with `cleared = 1`).
 */
import type { ApiMapInfo, MstMap } from '../fleet/types'

export const DIFFICULTIES = [1, 2, 3, 4] as const
export type Difficulty = (typeof DIFFICULTIES)[number]
export const GAUGE_STATES = ['chip', 'last', 'cleared'] as const
export type GaugeState = (typeof GAUGE_STATES)[number]

/** The game's first event area. */
export const FIRST_EVENT_AREA = 21

/** The HP band's open upper end, as the optimizer reads it (`GAUGE_LEVEL_UNBOUNDED`). */
const HP_MAX = 99999

export const areaOf = (map: string): number => Number(map.split('-')[0])
export const isEventMap = (map: string): boolean => areaOf(map) >= FIRST_EVENT_AREA

/** poi's id for a map: area and number run together, 623 for 62-3. */
export const mapIdOf = (map: string): string => {
  const [area, no] = map.split('-')
  return `${area}${no}`
}

/** Values chosen for a map; a missing value follows the game. */
export interface EventOverride {
  difficulty?: Difficulty
  gauge?: number
  gaugeState?: GaugeState
}

/** What a run simulates; `difficulty` undefined means none is chosen, `gaugeState` undefined means unknown. */
export interface EventState {
  difficulty?: Difficulty
  gauge: number
  gaugeState?: GaugeState
}

export const isDifficulty = (v: unknown): v is Difficulty => (DIFFICULTIES as readonly unknown[]).includes(v)
export const isGaugeState = (v: unknown): v is GaugeState => (GAUGE_STATES as readonly unknown[]).includes(v)

/** Map → difficulty → gauge → last-dance threshold, the game-data package's event gauges. */
export type EventGauges = Record<string, Record<string, Record<string, number>>>

export const thresholdOf = (gauges: EventGauges, map: string, difficulty: number | undefined, gauge: number): number | undefined =>
  difficulty === undefined ? undefined : gauges[map]?.[String(difficulty)]?.[String(gauge)]

/** The map's gauge numbers the package lists for the difficulty (any difficulty when none), sorted; empty when none. */
export function gaugesOf(gauges: EventGauges, map: string, difficulty: number | undefined): number[] {
  const byDifficulty = gauges[map] ?? {}
  const lists = difficulty !== undefined && byDifficulty[String(difficulty)] ? [byDifficulty[String(difficulty)]!] : Object.values(byDifficulty)
  return [...new Set(lists.flatMap((g) => Object.keys(g).map(Number)))].filter(Number.isInteger).sort((a, b) => a - b)
}

/** The state the game is in on `map`. */
export function eventStateFromGame(info: ApiMapInfo | undefined, gauges: EventGauges, map: string): EventState {
  const event = info?.api_eventmap
  const difficulty = isDifficulty(event?.api_selected_rank) ? event!.api_selected_rank : undefined
  const gauge = typeof event?.api_gauge_num === 'number' && event.api_gauge_num >= 1 ? event.api_gauge_num : 1
  if (info?.api_cleared === 1) return { difficulty, gauge, gaugeState: 'cleared' }
  const threshold = thresholdOf(gauges, map, difficulty, gauge)
  const hp = event?.api_now_maphp
  const gaugeState: GaugeState | undefined =
    threshold === undefined || typeof hp !== 'number' ? undefined : hp <= threshold ? 'last' : 'chip'
  return { difficulty, gauge, gaugeState }
}

/** The game's state with the user's overrides on top; mid-sortie, the game's alone. */
export function eventStateFor(input: {
  info: ApiMapInfo | undefined
  gauges: EventGauges
  map: string
  override?: EventOverride
  sortie: boolean
}): EventState {
  const game = eventStateFromGame(input.info, input.gauges, input.map)
  if (input.sortie || !input.override) return game
  const { difficulty = game.difficulty, gauge = game.gauge } = input.override
  const gaugeState =
    input.override.gaugeState ??
    // Another difficulty or gauge than the game's: its chip or last dance can't come from the game's HP.
    (difficulty === game.difficulty && gauge === game.gauge ? game.gaugeState : game.gaugeState === 'cleared' ? 'cleared' : undefined)
  return { difficulty, gauge, gaugeState }
}

/** The kcnav variant of an event state, and its HP band; for `[route.kcnav]` and `kcnav fetch` alike. */
export interface KcnavVariant {
  /** The optimizer's variant directory name. */
  name: string
  difficulty: Difficulty
  gauge?: number
  cleared: 0 | 1
  hpMin?: number
  hpMax?: number
}

/** The variant to read; undefined without a difficulty. */
export function kcnavVariant(state: EventState, threshold: number | undefined): KcnavVariant | undefined {
  const { difficulty, gauge, gaugeState } = state
  if (difficulty === undefined) return undefined
  if (gaugeState === 'cleared') return { name: `d${difficulty}-gx-c1-Lx`, difficulty, cleared: 1 }
  const band =
    threshold === undefined || gaugeState === undefined
      ? undefined
      : gaugeState === 'last'
        ? { hpMin: 1, hpMax: threshold }
        : { hpMin: threshold + 1, hpMax: HP_MAX }
  const l = band ? `${band.hpMin}_${band.hpMax}` : 'x'
  return { name: `d${difficulty}-g${gauge}-c0-L${l}`, difficulty, gauge, cleared: 0, ...band }
}

/** The variant's `kcnav fetch` flags. */
export const variantFetchArgs = (v: KcnavVariant): string[] => [
  '--difficulty',
  String(v.difficulty),
  '--cleared',
  String(v.cleared),
  ...(v.gauge !== undefined ? ['--min-gauge', String(v.gauge), '--max-gauge', String(v.gauge)] : []),
  ...(v.hpMin !== undefined ? ['--min-gauge-level', String(v.hpMin), '--max-gauge-level', String(v.hpMax)] : []),
]

/** The variant's `[route.kcnav]` lines. */
export const variantTomlLines = (v: KcnavVariant): string[] => [
  '[route.kcnav]',
  `difficulty = ${v.difficulty}`,
  `cleared = ${v.cleared}`,
  ...(v.gauge !== undefined ? [`gauge = ${v.gauge}`] : []),
  ...(v.hpMin !== undefined ? [`gauge_level_min = ${v.hpMin}`, `gauge_level_max = ${v.hpMax}`] : []),
]

/**
 * Whether the game lets a single fleet sortie on the map: bit 1 of `api_sally_flag[0]`. Unknown (no flag) counts as
 * allowed, so an unreadable flag never blocks a run.
 */
export function allowsSingleFleet(mst: MstMap | undefined): boolean {
  const flag = mst?.api_sally_flag?.[0]
  return typeof flag !== 'number' || (flag & 1) === 1
}
