/**
 * The panel's inputs: which maps are offered, and the choices remembered
 * between poi sessions in poi's config under `plugin.poi_battle_sim.*`;
 * plus the settings set on poi's settings page: the trial count, the rank
 * display, the automatic-run delay, the developer log and the development
 * optimizer override.
 */
import type { MstMap, MstMaparea, PoiState } from '../fleet/types'
import { readConfig, writeConfig } from '../poi'
import { normalizeChoices, type ChoiceValues } from '../routes/choices'

const PREFIX = 'plugin.poi_battle_sim'
export const DEFAULT_TRIALS = 2000
export const MAX_TRIALS = 100_000
/** Quick, Normal (the default) and Precise; any other count is Custom. */
export const TRIAL_PRESETS = [500, 2000, 10000] as const

export const isTrialPreset = (n: number): boolean => (TRIAL_PRESETS as readonly number[]).includes(n)

/** Normal maps (worlds 1–7, sub-maps included), in world/number order. Event areas are left out. */
export function normalMaps($maps: Record<string, MstMap> | undefined): string[] {
  return Object.values($maps ?? {})
    .filter((m) => m.api_maparea_id >= 1 && m.api_maparea_id <= 7)
    .sort((a, b) => a.api_maparea_id - b.api_maparea_id || a.api_no - b.api_no)
    .map((m) => `${m.api_maparea_id}-${m.api_no}`)
}

export interface MapOption {
  /** e.g. `7-2`. */
  map: string
  /** The map's master-data name (e.g. 鎮守府正面海域); undefined before the game data loads. */
  name?: string
}

export interface MapGroup {
  /** World number, e.g. 7 for 7-2. */
  area: number
  /** The sea area's master-data name (e.g. 鎮守府海域); undefined before the game data loads. */
  name?: string
  maps: MapOption[]
}

/** `normalMaps` output grouped by world, in order; groups and maps named from the master data. */
export function groupMapsByArea(
  maps: string[],
  $maps: Record<string, MstMap> | undefined,
  $mapareas: Record<string, MstMaparea> | undefined,
): MapGroup[] {
  const groups: MapGroup[] = []
  for (const map of maps) {
    const [area = 0, no = 0] = map.split('-').map(Number)
    let group = groups[groups.length - 1]
    if (group?.area !== area) {
      group = { area, name: $mapareas?.[String(area)]?.api_name, maps: [] }
      groups.push(group)
    }
    group.maps.push({ map, name: $maps?.[String(area * 10 + no)]?.api_name })
  }
  return groups
}

export const TRIALS_KEY = `${PREFIX}.trials`

/** Anything but a whole number of at least 1 is the default; above the maximum is the maximum. */
export const clampTrials = (n: unknown): number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_TRIALS) : DEFAULT_TRIALS

export const RANK_DISPLAY_KEY = `${PREFIX}.rankDisplay`

/** How A and B show: each rank on its own, or A or better (S + A) and B or better (S + A + B). */
export type RankDisplay = 'individual' | 'cumulative'

/** Individual unless the config holds `'cumulative'`. */
export const parseRankDisplay = (value: unknown): RankDisplay => (value === 'cumulative' ? 'cumulative' : 'individual')

/**
 * poi's config reads a stored `null` as missing, so a selection cleared by Reset is stored as these
 * and read back as null. A key that was never written still falls back to fleet 1 and 1-1.
 */
const NO_FLEET = 0
const NO_MAP = ''

export interface SavedInputs {
  /** Null after Reset, until the user picks one. */
  fleetId: number | null
  map: string | null
  /** Start a run by itself when the fleet or the inputs change. */
  auto: boolean
  /** Per map. */
  choices: Record<string, ChoiceValues>
  /** The node the planned sortie ends at, one for every map; undefined for the boss. */
  target?: string
  /** Pursue night battle at the target. */
  nightBattle: boolean
}

export function loadInputs(): SavedInputs {
  const fleetId = readConfig<unknown>(`${PREFIX}.fleetId`, 1)
  const map = readConfig<unknown>(`${PREFIX}.map`, '1-1')
  const choices = readConfig<unknown>(`${PREFIX}.choices`, {})
  const auto = readConfig<unknown>(`${PREFIX}.auto`, true)
  const target = readConfig<unknown>(`${PREFIX}.target`, null)
  const nightBattle = readConfig<unknown>(`${PREFIX}.nightBattle`, true)
  return {
    fleetId: fleetId === NO_FLEET ? null : typeof fleetId === 'number' && fleetId >= 1 && fleetId <= 4 ? fleetId : 1,
    map: map === NO_MAP ? null : typeof map === 'string' ? map : '1-1',
    auto: auto !== false,
    choices: choices !== null && typeof choices === 'object' ? (choices as Record<string, ChoiceValues>) : {},
    target: typeof target === 'string' && target !== '' ? target : undefined,
    nightBattle: nightBattle !== false,
  }
}

export function saveInputs(inputs: SavedInputs): void {
  writeConfig(`${PREFIX}.fleetId`, inputs.fleetId ?? NO_FLEET)
  writeConfig(`${PREFIX}.map`, inputs.map ?? NO_MAP)
  writeConfig(`${PREFIX}.auto`, inputs.auto)
  writeConfig(`${PREFIX}.choices`, inputs.choices)
  // poi's config reads a stored null as missing, so the boss is stored as null.
  writeConfig(`${PREFIX}.target`, inputs.target ?? null)
  writeConfig(`${PREFIX}.nightBattle`, inputs.nightBattle)
}

export const choicesForMap = (inputs: SavedInputs, map: string): ChoiceValues =>
  normalizeChoices(map, inputs.choices[map])

export const AUTO_RUN_DELAY_KEY = `${PREFIX}.autoRunDelay`
export const DEFAULT_AUTO_RUN_DELAY_MS = 1000
export const MAX_AUTO_RUN_DELAY_MS = 60_000

/** How long the inputs must stay unchanged before an automatic run starts; the default unless a whole 0–60000 ms. */
export function loadAutoRunDelay(): number {
  const ms = readConfig<unknown>(AUTO_RUN_DELAY_KEY, DEFAULT_AUTO_RUN_DELAY_MS)
  return typeof ms === 'number' && Number.isInteger(ms) && ms >= 0 && ms <= MAX_AUTO_RUN_DELAY_MS
    ? ms
    : DEFAULT_AUTO_RUN_DELAY_MS
}

export const DEV_LOG_KEY = `${PREFIX}.devLog`

/** Whether the developer log is on; off unless the config holds `true`. */
export const loadDevLog = (): boolean => readConfig<unknown>(DEV_LOG_KEY, false) === true

export const OPTIMIZER_BIN_KEY = `${PREFIX}.optimizerBin`
export const OPTIMIZER_DATA_KEY = `${PREFIX}.optimizerData`

const nonEmpty = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined

/**
 * The development optimizer override: poi's config first, then the
 * `BATTLE_SIM_OPTIMIZER_BIN` / `BATTLE_SIM_OPTIMIZER_DATA` environment
 * variables for a poi started from a shell. The binary and data path are
 * taken from the same source so the two never mix.
 */
export function loadOptimizerOverride(
  env: Record<string, string | undefined> = process.env,
): { bin?: string; data?: string } {
  const bin = nonEmpty(readConfig<unknown>(OPTIMIZER_BIN_KEY, ''))
  if (bin) return { bin, data: nonEmpty(readConfig<unknown>(OPTIMIZER_DATA_KEY, '')) }
  return { bin: nonEmpty(env.BATTLE_SIM_OPTIMIZER_BIN), data: nonEmpty(env.BATTLE_SIM_OPTIMIZER_DATA) }
}

/** poi's id for this plugin: `poiPlugin.id` in package.json, which poi prefers over the package name. */
export const PLUGIN_ID = 'poi_battle_sim'

/** Whether poi shows this plugin: the main tab, or the plugin pane's tab when double-tabbed. */
export function isPluginShown(state: Pick<PoiState, 'ui' | 'config'>): boolean {
  const double = state.config?.poi?.tabarea?.double === true
  return (double ? state.ui?.activePluginName : state.ui?.activeMainTab) === PLUGIN_ID
}
