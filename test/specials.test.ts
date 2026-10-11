import { afterEach, describe, expect, it } from 'vitest'

import { recordResponse, specialsFired, stopRecordingSpecials } from '../src/fleet/specials'

// Shaped like the kcsapi battle responses: day shelling phases carry api_at_type, night shelling api_sp_list.
const dayBattle = {
  api_hougeki1: { api_at_eflag: [0, 1, 0, 0], api_at_type: [100, 0, 2, 0] },
  api_hougeki2: { api_at_eflag: [1, 0], api_at_type: [101, 0] },
  api_hougeki3: null,
}
const nightBattle = { api_hougeki: { api_at_eflag: [0, 0, 1], api_sp_list: [104, 1, 104] } }

describe('special attacks record', () => {
  // `stopRecordingSpecials` touches `window`; give the node test environment a stand-in.
  ;(globalThis as { window?: unknown }).window ??= { removeEventListener: () => undefined }
  afterEach(() => stopRecordingSpecials())

  it('collects friendly specials from day and night shelling, one entry per firing', () => {
    recordResponse('/kcsapi/api_req_map/start', {})
    recordResponse('/kcsapi/api_req_sortie/battle', dayBattle)
    recordResponse('/kcsapi/api_req_battle_midnight/battle', nightBattle)
    expect(specialsFired()).toEqual({ fired: [100, 104], observed: true })
  })

  it('ignores enemy specials, ordinary attacks and unknown ids', () => {
    recordResponse('/kcsapi/api_req_map/start', {})
    recordResponse('/kcsapi/api_req_sortie/battle', {
      api_hougeki1: { api_at_eflag: [1, 0, 0], api_at_type: [100, 6, 999] },
    })
    expect(specialsFired().fired).toEqual([])
  })

  it('restarts on map/start, clears on port, and covers combined-fleet battles', () => {
    recordResponse('/kcsapi/api_req_map/start', {})
    recordResponse('/kcsapi/api_req_combined_battle/ec_battle', dayBattle)
    expect(specialsFired().fired).toEqual([100])
    recordResponse('/kcsapi/api_port/port', {})
    expect(specialsFired()).toEqual({ fired: [], observed: false })
    recordResponse('/kcsapi/api_req_map/start', {})
    expect(specialsFired()).toEqual({ fired: [], observed: true })
  })

  it('is not observed when the sortie started before the plugin loaded', () => {
    recordResponse('/kcsapi/api_req_sortie/battle', dayBattle)
    expect(specialsFired()).toEqual({ fired: [100], observed: false })
  })
})

describe('sortie events for the developer log', () => {
  it('reports the raw shelling fields, what was kept, and unknown specials', () => {
    recordResponse('/kcsapi/api_req_map/start', {})
    const event = recordResponse('/kcsapi/api_req_sortie/battle', {
      api_hougeki1: { api_at_eflag: [0, 0, 1], api_at_list: [0, 2, 1], api_at_type: [100, 120, 101] },
    })
    expect(event).toEqual({
      event: 'sortie.battle',
      path: '/kcsapi/api_req_sortie/battle',
      phases: [
        {
          key: 'api_hougeki1',
          api_at_eflag: [0, 0, 1],
          api_at_list: [0, 2, 1],
          types: [100, 120, 101],
          kept: [100],
          unknown: [120],
        },
      ],
      record: { fired: [100], observed: true },
    })
    expect(recordResponse('/kcsapi/api_get_member/ship_deck', {})).toBeUndefined()
    expect(recordResponse('/kcsapi/api_req_sortie/battleresult', {})).toBeUndefined()
    expect(recordResponse('/kcsapi/api_req_combined_battle/battleresult', {})).toBeUndefined()
    expect(recordResponse('/kcsapi/api_req_combined_battle/goback_port', {})).toBeUndefined()
    stopRecordingSpecials()
  })

})
