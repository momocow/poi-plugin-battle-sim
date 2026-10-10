/**
 * The panel's inputs: which maps are offered, and the choices remembered
 * between poi sessions in poi's config under `plugin.poi_battle_sim.*`;
 * plus the development optimizer override set on poi's settings page.
 */
import type { MstMap, MstMaparea } from '../fleet/types'
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

export const clampTrials = (n: unknown): number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_TRIALS) : DEFAULT_TRIALS

export interface SavedInputs {
  fleetId: number
  map: string
  trials: number
  /** Start a run by itself when the fleet or the inputs change. */
  auto: boolean
  /** Per map. */
  choices: Record<string, ChoiceValues>
}

export function loadInputs(): SavedInputs {
  const fleetId = readConfig<unknown>(`${PREFIX}.fleetId`, 1)
  const map = readConfig<unknown>(`${PREFIX}.map`, '1-1')
  const choices = readConfig<unknown>(`${PREFIX}.choices`, {})
  const auto = readConfig<unknown>(`${PREFIX}.auto`, true)
  return {
    fleetId: typeof fleetId === 'number' && fleetId >= 1 && fleetId <= 4 ? fleetId : 1,
    map: typeof map === 'string' ? map : '1-1',
    trials: clampTrials(readConfig<unknown>(`${PREFIX}.trials`, DEFAULT_TRIALS)),
    auto: auto !== false,
    choices: choices !== null && typeof choices === 'object' ? (choices as Record<string, ChoiceValues>) : {},
  }
}

export function saveInputs(inputs: SavedInputs): void {
  writeConfig(`${PREFIX}.fleetId`, inputs.fleetId)
  writeConfig(`${PREFIX}.map`, inputs.map)
  writeConfig(`${PREFIX}.trials`, inputs.trials)
  writeConfig(`${PREFIX}.auto`, inputs.auto)
  writeConfig(`${PREFIX}.choices`, inputs.choices)
}

export const choicesForMap = (inputs: SavedInputs, map: string): ChoiceValues =>
  normalizeChoices(map, inputs.choices[map])

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
