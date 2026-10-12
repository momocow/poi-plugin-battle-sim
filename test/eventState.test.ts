import { describe, expect, it } from 'vitest'

import {
  allowsSingleFleet,
  eventStateFor,
  eventStateFromGame,
  gaugesOf,
  isEventMap,
  kcnavVariant,
  variantFetchArgs,
  variantTomlLines,
} from '../src/routes/eventState'

const gauges = { '62-3': { '4': { '1': 900, '2': 4800 }, '1': { '2': 600 } } }
const info = (hp: number, extra: object = {}) => ({
  api_id: 623,
  api_eventmap: { api_now_maphp: hp, api_max_maphp: 9000, api_selected_rank: 4, api_gauge_num: 2 },
  ...extra,
})

describe('event state from the game', () => {
  it('reads difficulty, gauge and last dance from the HP and the threshold', () => {
    expect(eventStateFromGame(info(3000), gauges, '62-3')).toEqual({ difficulty: 4, gauge: 2, gaugeState: 'last' })
    expect(eventStateFromGame(info(6000), gauges, '62-3')).toEqual({ difficulty: 4, gauge: 2, gaugeState: 'chip' })
  })

  it('leaves the gauge state unknown without a threshold, and reads a cleared map', () => {
    expect(eventStateFromGame(info(3000), {}, '62-3').gaugeState).toBeUndefined()
    expect(eventStateFromGame(info(0, { api_cleared: 1 }), gauges, '62-3').gaugeState).toBe('cleared')
  })

  it('has no difficulty before the player picks one', () => {
    expect(eventStateFromGame({ api_id: 624, api_eventmap: { api_selected_rank: 0 } }, gauges, '62-4').difficulty).toBeUndefined()
  })
})

describe('overrides', () => {
  it('apply over the game, except mid-sortie', () => {
    const base = { info: info(3000), gauges, map: '62-3' }
    expect(eventStateFor({ ...base, override: { difficulty: 1 }, sortie: false })).toEqual({ difficulty: 1, gauge: 2, gaugeState: undefined })
    expect(eventStateFor({ ...base, override: { difficulty: 1, gaugeState: 'chip' }, sortie: false }).gaugeState).toBe('chip')
    expect(eventStateFor({ ...base, override: { difficulty: 1 }, sortie: true }).difficulty).toBe(4)
  })

  it('lists the gauges the package has for the difficulty', () => {
    expect(gaugesOf(gauges, '62-3', 4)).toEqual([1, 2])
    expect(gaugesOf(gauges, '62-3', 3)).toEqual([1, 2])
    expect(gaugesOf(gauges, '62-5', 4)).toEqual([])
  })
})

describe('kcnav variant', () => {
  it('names the variant as the optimizer does', () => {
    expect(kcnavVariant({ difficulty: 4, gauge: 2, gaugeState: 'last' }, 4800)?.name).toBe('d4-g2-c0-L1_4800')
    expect(kcnavVariant({ difficulty: 4, gauge: 2, gaugeState: 'chip' }, 4800)?.name).toBe('d4-g2-c0-L4801_99999')
    expect(kcnavVariant({ difficulty: 4, gauge: 2, gaugeState: 'last' }, undefined)?.name).toBe('d4-g2-c0-Lx')
    expect(kcnavVariant({ difficulty: 3, gauge: 1, gaugeState: 'cleared' }, 4800)?.name).toBe('d3-gx-c1-Lx')
    expect(kcnavVariant({ gauge: 1, gaugeState: 'chip' }, 4800)).toBeUndefined()
  })

  it('gives the same dimensions to the TOML and the fetch', () => {
    const v = kcnavVariant({ difficulty: 4, gauge: 2, gaugeState: 'last' }, 4800)!
    expect(variantTomlLines(v)).toEqual(['[route.kcnav]', 'difficulty = 4', 'cleared = 0', 'gauge = 2', 'gauge_level_min = 1', 'gauge_level_max = 4800'])
    expect(variantFetchArgs(v)).toEqual(['--difficulty', '4', '--cleared', '0', '--min-gauge', '2', '--max-gauge', '2', '--min-gauge-level', '1', '--max-gauge-level', '4800'])
    const cleared = kcnavVariant({ difficulty: 3, gauge: 1, gaugeState: 'cleared' }, 4800)!
    expect(variantTomlLines(cleared)).toEqual(['[route.kcnav]', 'difficulty = 3', 'cleared = 1'])
  })
})

describe('maps', () => {
  it('tells event maps from normal maps', () => {
    expect(['1-1', '7-5', '21-1', '62-3'].map(isEventMap)).toEqual([false, false, true, true])
  })

  it('allows a single fleet unless the sally flag says otherwise', () => {
    const map = (flag?: number[]) => ({ api_id: 623, api_maparea_id: 62, api_no: 3, api_name: '', api_sally_flag: flag })
    expect(allowsSingleFleet(map([1, 0]))).toBe(true)
    expect(allowsSingleFleet(map([0, 7]))).toBe(false)
    expect(allowsSingleFleet(map())).toBe(true)
    expect(allowsSingleFleet(undefined)).toBe(true)
  })
})
