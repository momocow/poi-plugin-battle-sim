import { afterEach, describe, expect, it } from 'vitest'

import {
  choicesForMap,
  clampTrials,
  groupMapsByArea,
  isPluginShown,
  isTrialPreset,
  loadInputs,
  normalMaps,
  parseRankDisplay,
  PLUGIN_ID,
  RANK_DISPLAY_KEY,
  saveInputs,
  TRIALS_KEY,
} from '../src/ui/inputs'
import { loadStore } from './helpers'

describe('map list', () => {
  it('offers worlds 1–7 including sub-maps, and no event maps', () => {
    const maps = normalMaps(loadStore().const!.$maps)
    expect(maps[0]).toBe('1-1')
    expect(maps).toContain('7-2')
    expect(maps).toContain('7-5')
    expect(maps.every((m) => Number(m.split('-')[0]) <= 7)).toBe(true)
    expect(normalMaps({ 611: { api_id: 611, api_maparea_id: 61, api_no: 1, api_name: 'event' } })).toEqual([])
  })

  it('groups maps by sea area, named from the master data', () => {
    const store = loadStore()
    const groups = groupMapsByArea(normalMaps(store.const!.$maps), store.const!.$maps, store.const!.$mapareas)
    expect(groups.map((g) => g.area)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(groups[0]!.name).toBe('鎮守府海域')
    expect(groups[0]!.maps[0]).toEqual({ map: '1-1', name: '鎮守府正面海域' })
    expect(groups[6]!.maps).toContainEqual({ map: '7-5', name: 'ジャワ島沖' })
    expect(groupMapsByArea(['1-1', '1-2', '2-1'], undefined, undefined)).toEqual([
      { area: 1, name: undefined, maps: [{ map: '1-1', name: undefined }, { map: '1-2', name: undefined }] },
      { area: 2, name: undefined, maps: [{ map: '2-1', name: undefined }] },
    ])
  })
})

describe('trial presets', () => {
  it('selects a preset for 500, 2000 and 10000, and Custom otherwise', () => {
    expect([500, 2000, 10000].map(isTrialPreset)).toEqual([true, true, true])
    expect([3000, 1, 100000].map(isTrialPreset)).toEqual([false, false, false])
  })
})

describe('saved inputs', () => {
  const g = globalThis as { window?: unknown }
  afterEach(() => delete g.window)

  it('round-trips through poi config, with defaults when nothing is saved', () => {
    const store = new Map<string, unknown>()
    g.window = { config: { get: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f), set: (k: string, v: unknown) => store.set(k, v) } }
    expect(loadInputs()).toEqual({ fleetId: 1, map: '1-1', auto: true, choices: {}, nightBattle: true, formations: {} })
    saveInputs({
      fleetId: 2,
      map: '5-2',
      auto: false,
      choices: { '7-5': { F: 'J', H: 'I', O: 'P' } },
      target: 'E',
      nightBattle: false,
      formations: { '5-2': { C: 'LineAhead', D: 'DoubleLine' } },
    })
    const loaded = loadInputs()
    expect(loaded.formations).toEqual({ '5-2': { C: 'LineAhead', D: 'DoubleLine' } })
    expect(loaded).toMatchObject({ fleetId: 2, map: '5-2', auto: false, target: 'E', nightBattle: false })
    expect(choicesForMap(loaded, '7-5')).toEqual({ F: 'J', H: 'I', O: 'P' })
    expect(choicesForMap(loaded, '5-6')).toEqual({ I: 'J', O: 'P', phase: '1' })
  })

  it('remembers a selection cleared by Reset, which a never-written key is not', () => {
    const store = new Map<string, unknown>()
    g.window = { config: { get: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f), set: (k: string, v: unknown) => store.set(k, v) } }
    saveInputs({ fleetId: null, map: null, auto: true, choices: { '7-5': { F: 'J', H: 'I', O: 'P' } }, nightBattle: true, formations: {} })
    // Not null: poi's config would read that back as missing.
    expect([store.get('plugin.poi_battle_sim.fleetId'), store.get('plugin.poi_battle_sim.map')]).toEqual([0, ''])
    expect(loadInputs()).toMatchObject({ fleetId: null, map: null, auto: true })
    store.delete('plugin.poi_battle_sim.fleetId')
    store.delete('plugin.poi_battle_sim.map')
    expect(loadInputs()).toMatchObject({ fleetId: 1, map: '1-1' })
    store.set('plugin.poi_battle_sim.fleetId', null)
    expect(loadInputs().fleetId).toBe(1)
  })

  it('stores the boss target as null, read back as the boss, and falls back on invalid values', () => {
    const store = new Map<string, unknown>()
    g.window = { config: { get: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f), set: (k: string, v: unknown) => store.set(k, v) } }
    saveInputs({ fleetId: 1, map: '2-5', auto: true, choices: {}, target: undefined, nightBattle: true, formations: {} })
    expect(store.get('plugin.poi_battle_sim.target')).toBeNull()
    expect(loadInputs()).toMatchObject({ target: undefined, nightBattle: true })
    store.set('plugin.poi_battle_sim.target', 7)
    store.set('plugin.poi_battle_sim.nightBattle', 'off')
    expect(loadInputs()).toMatchObject({ target: undefined, nightBattle: true })
    store.set('plugin.poi_battle_sim.target', '')
    expect(loadInputs().target).toBeUndefined()
  })

  it('drops saved formations that are not formations of node letters', () => {
    const store = new Map<string, unknown>([
      [
        'plugin.poi_battle_sim.formations',
        { '5-2': { C: 'Diamond', D: 'CF1', E: 3, '': 'Echelon' }, '1-5': 'LineAbreast', '2-5': { E: 'Wedge' } },
      ],
    ])
    g.window = { config: { get: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f), set: (k: string, v: unknown) => store.set(k, v) } }
    expect(loadInputs().formations).toEqual({ '5-2': { C: 'Diamond' } })
    store.set('plugin.poi_battle_sim.formations', ['Diamond'])
    expect(loadInputs().formations).toEqual({})
  })

  it('leaves the trial count, set on the settings page, alone', () => {
    const store = new Map<string, unknown>([[TRIALS_KEY, 500]])
    g.window = { config: { get: (k: string, f: unknown) => (store.has(k) ? store.get(k) : f), set: (k: string, v: unknown) => store.set(k, v) } }
    saveInputs({ fleetId: 1, map: '1-1', auto: true, choices: {}, nightBattle: true, formations: {} })
    expect(store.get(TRIALS_KEY)).toBe(500)
    expect(TRIALS_KEY).toBe('plugin.poi_battle_sim.trials')
  })

  it('clamps the trial count', () => {
    expect(clampTrials(0)).toBe(2000)
    expect(clampTrials(1.5)).toBe(2000)
    expect(clampTrials(10_000_000)).toBe(100_000)
    expect(clampTrials(undefined)).toBe(2000)
    expect(clampTrials('fast')).toBe(2000)
    expect(clampTrials(3000)).toBe(3000)
  })
})

describe('rank display', () => {
  it('is individual unless the config holds "cumulative"', () => {
    expect(RANK_DISPLAY_KEY).toBe('plugin.poi_battle_sim.rankDisplay')
    expect(parseRankDisplay('cumulative')).toBe('cumulative')
    for (const v of [undefined, 'individual', 'both', true, null]) expect(parseRankDisplay(v)).toBe('individual')
  })
})

describe('auto-run delay', () => {
  const g = globalThis as { window?: unknown }
  afterEach(() => delete g.window)

  it('reads a whole 0–60000 ms from poi config, else 1000', async () => {
    const { loadAutoRunDelay, AUTO_RUN_DELAY_KEY } = await import('../src/ui/inputs')
    const withDelay = (v: unknown) => (g.window = { config: { get: (k: string, f: unknown) => (k === AUTO_RUN_DELAY_KEY ? v : f) } })
    g.window = { config: { get: (_k: string, f: unknown) => f } }
    expect(loadAutoRunDelay()).toBe(1000)
    for (const v of [0, 3000, 60000]) {
      withDelay(v)
      expect(loadAutoRunDelay()).toBe(v)
    }
    for (const v of [-5, 1.5, 60001, 'fast', null]) {
      withDelay(v)
      expect(loadAutoRunDelay()).toBe(1000)
    }
  })
})

describe('optimizer override', () => {
  const g = globalThis as { window?: unknown }
  afterEach(() => delete g.window)
  const withConfig = (values: Record<string, unknown>) =>
    (g.window = { config: { get: (k: string, f: unknown) => (k in values ? values[k] : f) } })

  it('prefers poi config over the environment, taking both paths from one source', async () => {
    const { loadOptimizerOverride, OPTIMIZER_BIN_KEY, OPTIMIZER_DATA_KEY } = await import('../src/ui/inputs')
    const env = { BATTLE_SIM_OPTIMIZER_BIN: '/env/bin', BATTLE_SIM_OPTIMIZER_DATA: '/env/data' }
    withConfig({ [OPTIMIZER_BIN_KEY]: ' /cfg/bin ', [OPTIMIZER_DATA_KEY]: '' })
    expect(loadOptimizerOverride(env)).toEqual({ bin: '/cfg/bin', data: undefined })
    withConfig({ [OPTIMIZER_BIN_KEY]: '' })
    expect(loadOptimizerOverride(env)).toEqual({ bin: '/env/bin', data: '/env/data' })
    withConfig({})
    expect(loadOptimizerOverride({})).toEqual({ bin: undefined, data: undefined })
  })
})

describe('plugin shown', () => {
  const double = { poi: { tabarea: { double: true } } }

  it('uses the id poi gives the plugin', async () => {
    const pkg = (await import('../package.json')).default as { poiPlugin: { id: string } }
    expect(PLUGIN_ID).toBe(pkg.poiPlugin.id)
  })

  it('reads the main tab in the single layout', () => {
    expect(isPluginShown({ ui: { activeMainTab: PLUGIN_ID, activePluginName: 'other' } })).toBe(true)
    expect(isPluginShown({ ui: { activeMainTab: 'main-view', activePluginName: PLUGIN_ID } })).toBe(false)
  })

  it('reads the plugin pane when double-tabbed', () => {
    expect(isPluginShown({ ui: { activeMainTab: 'main-view', activePluginName: PLUGIN_ID }, config: double })).toBe(true)
    expect(isPluginShown({ ui: { activeMainTab: PLUGIN_ID, activePluginName: 'other' }, config: double })).toBe(false)
  })

  it('is not shown without poi\'s tab state', () => {
    expect(isPluginShown({})).toBe(false)
    expect(isPluginShown({ config: double })).toBe(false)
  })
})
