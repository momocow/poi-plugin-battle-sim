/**
 * The once-per-sortie special attacks the player's fleet has fired in the
 * sortie in progress, for the optimizer's `special_attacks_fired`.
 *
 * poi's battle store keeps only the current node, so the plugin records them
 * itself from each battle response, one entry per firing: `api_at_type` in the
 * day shelling phases and `api_sp_list` in the night shelling, for friendly
 * attackers (`api_at_eflag` 0). Only the ids the optimizer accepts are kept, so
 * a special the game adds later can't fail every run. The record restarts on
 * `map/start` and clears on port; `observed` says whether it has seen the
 * sortie from its start, which it hasn't when the plugin was reloaded mid-sortie
 * (turned off and on, or updated, while the game kept running).
 * Each of these events goes to the developer log when it is on, with the
 * battle's raw shelling fields, so the record can be checked against them.
 */
import { devLog } from '../devlog'

const KNOWN = new Set([100, 101, 102, 103, 104, 105, 106, 400, 401])
// The battle responses of a sortie; the result and the escort retreat share their prefix but carry no shelling.
const BATTLE = /^\/kcsapi\/api_req_(sortie|battle_midnight|combined_battle)\/(?!battleresult$|goback_port$)/
const DAY_PHASES = ['api_hougeki1', 'api_hougeki2', 'api_hougeki3'] as const

export interface SpecialsRecord {
  fired: number[]
  /** False until a `map/start` has been seen since the last port. */
  observed: boolean
}

let record: SpecialsRecord = { fired: [], observed: false }

export const specialsFired = (): SpecialsRecord => ({ fired: [...record.fired], observed: record.observed })

/** One shelling phase's attacker lists, as sent, and the friendly special-attack ids in them. */
interface Phase {
  key: string
  api_at_eflag: unknown
  api_at_list: unknown
  types: unknown
  kept: number[]
  /** Friendly attack types of 100 and above that the optimizer doesn't know: a special the game added. */
  unknown: number[]
}

function readPhase(body: Record<string, unknown>, key: string, typesKey: 'api_at_type' | 'api_sp_list'): Phase[] {
  const phase = body[key]
  if (typeof phase !== 'object' || phase === null) return []
  const { api_at_eflag, api_at_list } = phase as Record<string, unknown>
  const types = (phase as Record<string, unknown>)[typesKey]
  const friendly =
    Array.isArray(api_at_eflag) && Array.isArray(types)
      ? types.filter((type, i): type is number => api_at_eflag[i] === 0 && typeof type === 'number')
      : []
  return [
    {
      key,
      api_at_eflag,
      api_at_list,
      types,
      kept: friendly.filter((type) => KNOWN.has(type)),
      unknown: friendly.filter((type) => type >= 100 && !KNOWN.has(type)),
    },
  ]
}

/** What one game response did to the record, for the developer log; undefined when it isn't a sortie event. */
export type RecordEvent =
  | { event: 'sortie.start' | 'sortie.port'; record: SpecialsRecord }
  | { event: 'sortie.battle'; path: string; phases: Phase[]; record: SpecialsRecord }

/** Update the record from one game response. */
export function recordResponse(path: string, body: unknown): RecordEvent | undefined {
  if (path === '/kcsapi/api_req_map/start') {
    record = { fired: [], observed: true }
    return { event: 'sortie.start', record: specialsFired() }
  }
  if (path === '/kcsapi/api_port/port') {
    record = { fired: [], observed: false }
    return { event: 'sortie.port', record: specialsFired() }
  }
  if (!BATTLE.test(path) || typeof body !== 'object' || body === null) return undefined
  const b = body as Record<string, unknown>
  const phases = [
    ...DAY_PHASES.flatMap((key) => readPhase(b, key, 'api_at_type')),
    ...readPhase(b, 'api_hougeki', 'api_sp_list'),
  ]
  record.fired.push(...phases.flatMap((p) => p.kept))
  return { event: 'sortie.battle', path, phases, record: specialsFired() }
}

const onResponse = (e: Event): void => {
  const detail = (e as CustomEvent<{ path?: unknown; body?: unknown }>).detail
  if (typeof detail?.path !== 'string') return
  const happened = recordResponse(detail.path, detail.body)
  if (happened) {
    const { event, ...data } = happened
    devLog(event, data)
  }
}

export function startRecordingSpecials(): void {
  window.addEventListener('game.response', onResponse)
}

export function stopRecordingSpecials(): void {
  window.removeEventListener('game.response', onResponse)
  record = { fired: [], observed: false }
}
