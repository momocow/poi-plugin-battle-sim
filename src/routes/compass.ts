/**
 * Route prediction with the compass route simulator (x-20a.github.io/compass).
 *
 * Compass runs in a hidden `<webview>` in its own non-persistent partition,
 * created per prediction and removed afterwards, so it never shares cookies or
 * storage with poi's game view. The fleet goes in as a deck-builder document
 * (`?pdz=`, LZString), and a script injected into the page drives compass's
 * Pinia store and reads `simResult`. Every failure is a typed error; there is
 * no fallback and no automatic retry.
 *
 * On some event maps compass also routes by difficulty, an `options[map]` key
 * like the choices (`difficulty: "1"`–`"4"`, bundle of 2026-10-12). It is
 * optional: set from `choices.difficulty` where compass has it, and not part
 * of the key check, since only some event maps have it.
 */
import { compressToEncodedURIComponent } from 'lz-string'

import { SimError, type ErrorCode } from '../errors'
import type { DeckBuilder } from '../fleet/toDeckbuilder'
import { choiceKeys, type ChoiceValues } from './choices'

export const COMPASS_ORIGIN = 'https://x-20a.github.io'
export const COMPASS_URL = `${COMPASS_ORIGIN}/compass/`
export const COMPASS_PARTITION = 'battle-sim-compass'
/** How long compass may take to produce routes once the page is up. */
export const ROUTE_TIMEOUT_MS = 20_000
/** How long the page itself may take to load. */
export const LOAD_TIMEOUT_MS = 20_000

export interface RawRoute {
  route: string[]
  rate: string
}

export type ScriptResult =
  | { ok: true; routes: RawRoute[] }
  | { ok: false; code: ErrorCode; message: string; details: string[] }

export interface CompassCandidate {
  /** Node letters from the start node to the last node. */
  nodes: string[]
  probability: number
}

export function compassUrl(deck: DeckBuilder): string {
  return `${COMPASS_URL}?pdz=${compressToEncodedURIComponent(JSON.stringify(deck))}`
}

/** `options[map]` keys compass has on some maps only: set when present, never required. */
export const OPTIONAL_KEYS = ['difficulty']

export interface ScriptParams {
  map: string
  choices: ChoiceValues
  /** Keys compass's `options[map]` must have, sorted. */
  keys: string[]
  /** Keys to set only where compass has them. */
  optional: string[]
  timeoutMs: number
  pollMs: number
  mountWaitMs: number
}

/**
 * Runs inside the compass page. Self-contained: it is serialized with
 * `toString()` and must not close over anything.
 *
 * Before applying the inputs it clears the routes and any error, and sets the
 * area to null and back, so compass recomputes even when this partition's
 * earlier run left the same area selected.
 */
export async function compassPageScript(p: ScriptParams): Promise<ScriptResult> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const fail = (code: ErrorCode, message: string, details: string[] = []): ScriptResult => ({
    ok: false,
    code,
    message,
    details,
  })
  // The page's objects are untyped; everything read from them is checked before use.
  type Loose = any
  type Store = Record<string, Loose>
  const findStore = (name: string): Store | undefined => {
    try {
      const app = (document.querySelector('#app') as unknown as { __vue_app__?: Loose })?.__vue_app__
      return app?.config?.globalProperties?.$pinia?._s?.get(name)
    } catch {
      return undefined
    }
  }

  let store = findStore('compass')
  for (let waited = 0; !store && waited < p.mountWaitMs; waited += p.pollMs) {
    await sleep(p.pollMs)
    store = findStore('compass')
  }
  if (!store) return fail('COMPASS_SHAPE', 'The compass page has no route state.', ["store 'compass' not found"])
  if (typeof store.UPDATE_SELECTED_AREA !== 'function' || !Array.isArray(store.simResult)) {
    return fail('COMPASS_SHAPE', 'The compass page has an unexpected structure.', [
      `UPDATE_SELECTED_AREA: ${typeof store.UPDATE_SELECTED_AREA}`,
      `simResult is array: ${String(Array.isArray(store.simResult))}`,
    ])
  }

  const present = Object.keys((store.options && store.options[p.map]) || {})
  const actual = present.filter((k) => !p.optional.includes(k)).sort()
  const optional = p.optional.filter((k) => present.includes(k) && p.choices[k] !== undefined)
  if (actual.join(',') !== p.keys.join(',')) {
    const unknown = actual.filter((k) => !p.keys.includes(k))
    const gone = p.keys.filter((k) => !actual.includes(k))
    return fail('COMPASS_SHAPE', `Compass's branch choices for ${p.map} have changed.`, [
      ...unknown.map((k) => `${p.map}: compass has a choice at ${k} that the plugin does not know`),
      ...gone.map((k) => `${p.map}: compass no longer has a choice at ${k}`),
    ])
  }
  if (p.keys.length + optional.length > 0 && typeof store.UPDATE_OPTION_WITH_KEY !== 'function') {
    return fail('COMPASS_SHAPE', 'The compass page has an unexpected structure.', [
      `UPDATE_OPTION_WITH_KEY: ${typeof store.UPDATE_OPTION_WITH_KEY}`,
    ])
  }

  const modal = findStore('modal')
  if (typeof store.CLEAR_ROUTES === 'function') store.CLEAR_ROUTES()
  if (modal) modal.isErrorVisible = false
  store.UPDATE_SELECTED_AREA(null)
  store.UPDATE_SELECTED_AREA(p.map)
  for (const key of [...p.keys, ...optional]) store.UPDATE_OPTION_WITH_KEY(p.map, key, p.choices[key])

  for (let waited = 0; waited < p.timeoutMs; waited += p.pollMs) {
    await sleep(p.pollMs)
    if (modal && modal.isErrorVisible) {
      const message = String(modal.errorMessage ?? '')
      return fail(
        'COMPASS_UNSUPPORTED_MAP',
        message.includes('AreaId')
          ? `Compass does not support ${p.map}.`
          : `Compass cannot route this fleet on ${p.map}.`,
        [`compass: ${message}`],
      )
    }
    const result = store.simResult
    if (!Array.isArray(result)) {
      return fail('COMPASS_SHAPE', 'The compass page has an unexpected structure.', ['simResult is not an array'])
    }
    const routes = result.filter((r: Loose) => r && Array.isArray(r.route) && r.route.length > 0)
    if (routes.length > 0) {
      return {
        ok: true,
        routes: routes.map((r: Loose) => ({ route: r.route.map(String), rate: String(r.rate) })),
      }
    }
  }
  return fail('COMPASS_TIMEOUT', `Compass returned no route within ${p.timeoutMs / 1000} s.`)
}

export function buildPageScript(map: string, choices: ChoiceValues): string {
  const params: ScriptParams = {
    map,
    choices,
    keys: choiceKeys(map),
    optional: OPTIONAL_KEYS,
    timeoutMs: ROUTE_TIMEOUT_MS,
    pollMs: 250,
    mountWaitMs: 5_000,
  }
  return `(${compassPageScript.toString()})(${JSON.stringify(params)})`
}

/** Turn what the page returned into candidates, or throw the typed error. */
export function parseScriptResult(result: unknown): CompassCandidate[] {
  const r = result as ScriptResult | undefined
  if (!r || typeof r !== 'object' || typeof r.ok !== 'boolean') {
    throw new SimError('COMPASS_SHAPE', 'The compass page returned something unexpected.', [JSON.stringify(result)])
  }
  if (!r.ok) throw new SimError(r.code, r.message, r.details)

  const candidates = r.routes.map((route) => ({ nodes: route.route, probability: Number(route.rate) }))
  const bad = candidates.find((c) => !Number.isFinite(c.probability) || c.probability < 0 || c.probability > 1)
  const sum = candidates.reduce((acc, c) => acc + c.probability, 0)
  if (bad || Math.abs(sum - 1) > 1e-6) {
    throw new SimError('COMPASS_SHAPE', 'Compass returned route probabilities that do not add up to 1.', [
      ...r.routes.map((route) => `${route.route.join('-')}: ${route.rate}`),
      `sum: ${sum}`,
    ])
  }
  return candidates
}

/** The part of Electron's `<webview>` element this module uses. */
interface WebviewElement extends HTMLElement {
  src: string
  executeJavaScript(code: string): Promise<unknown>
}

/**
 * Load compass in a fresh hidden webview, run the script, and remove the
 * webview whatever happens.
 */
export async function runCompass(deck: DeckBuilder, map: string, choices: ChoiceValues): Promise<CompassCandidate[]> {
  const webview = document.createElement('webview') as WebviewElement
  webview.setAttribute('partition', COMPASS_PARTITION)
  // Off-screen rather than display:none, which would keep the page from loading.
  webview.setAttribute(
    'style',
    'position:fixed;left:-10000px;top:0;width:1024px;height:768px;visibility:hidden;pointer-events:none;',
  )

  let loadTimer: ReturnType<typeof setTimeout> | undefined
  try {
    const ready = new Promise<void>((resolve, reject) => {
      const unreachable = (detail: string) =>
        reject(new SimError('COMPASS_UNREACHABLE', 'The compass page could not be loaded.', [detail]))
      loadTimer = setTimeout(() => unreachable(`no response within ${LOAD_TIMEOUT_MS / 1000} s`), LOAD_TIMEOUT_MS)
      webview.addEventListener('did-fail-load', (event) => {
        const e = event as Event & { errorCode?: number; errorDescription?: string; isMainFrame?: boolean }
        // -3 is an aborted sub-request, not a failed page.
        if (e.isMainFrame !== false && e.errorCode !== -3) {
          unreachable(`${e.errorDescription ?? 'load failed'} (${String(e.errorCode)})`)
        }
      })
      webview.addEventListener('dom-ready', () => resolve(), { once: true })
    })
    webview.src = compassUrl(deck)
    document.body.appendChild(webview)
    await ready
    clearTimeout(loadTimer)
    return parseScriptResult(await webview.executeJavaScript(buildPageScript(map, choices)))
  } finally {
    clearTimeout(loadTimer)
    webview.remove()
  }
}
