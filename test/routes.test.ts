import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SimError } from '../src/errors'
import { snapshotFleet } from '../src/fleet/snapshot'
import { toDeckbuilder } from '../src/fleet/toDeckbuilder'
import { applyTarget, bossLettersFor, endsAtBoss, loadBossLetters } from '../src/routes/boss'
import { choiceKeys, defaultChoices, normalizeChoices } from '../src/routes/choices'
import {
  buildPageScript,
  COMPASS_PARTITION,
  compassPageScript,
  compassUrl,
  parseScriptResult,
  runCompass,
  type ScriptParams,
} from '../src/routes/compass'
import { createPredictor, predictionKey } from '../src/routes/predict'
import { battleNodes, nightOnlyNodes, topologyNow } from '../src/routes/topology'
import { loadStore } from './helpers'

/** A stand-in for compass's Pinia stores, behind the same `#app` lookup path. */
function fakeCompass(opts: {
  options?: Record<string, Record<string, string>>
  routes?: (area: string, options: Record<string, string> | undefined) => { route: string[]; rate: { toString(): string } }[]
  error?: string
  shape?: 'missing' | 'no-action'
}) {
  const empty = [{ route: [] as string[], rate: '0' }]
  const modal = { isErrorVisible: false, errorMessage: '' }
  const store: Record<string, unknown> = {
    simResult: empty,
    selectedArea: null as string | null,
    options: opts.options ?? {},
    applied: [] as [string, string, string][],
    CLEAR_ROUTES() {
      store.simResult = empty
    },
    UPDATE_SELECTED_AREA(area: string | null) {
      store.selectedArea = area
      // Compass recomputes asynchronously in a watcher.
      setTimeout(() => {
        if (!store.selectedArea) return
        if (opts.error) {
          modal.isErrorVisible = true
          modal.errorMessage = opts.error
          store.simResult = empty
          return
        }
        if (opts.routes) {
          const area = store.selectedArea as string
          store.simResult = opts.routes(area, (store.options as Record<string, Record<string, string>>)[area])
        }
      }, 5)
    },
    UPDATE_OPTION_WITH_KEY(area: string, key: string, value: string) {
      ;(store.applied as [string, string, string][]).push([area, key, value])
      const o = (store.options as Record<string, Record<string, string>>)[area]
      if (o) o[key] = value
    },
  }
  if (opts.shape === 'no-action') delete store.UPDATE_SELECTED_AREA
  const stores = new Map<string, unknown>([
    ['compass', store],
    ['modal', modal],
  ])
  const app = opts.shape === 'missing' ? {} : { __vue_app__: { config: { globalProperties: { $pinia: { _s: stores } } } } }
  return { document: { querySelector: (sel: string) => (sel === '#app' ? app : null) }, store, modal }
}

const params = (map: string, choices = defaultChoices(map)): ScriptParams => ({
  map,
  choices,
  keys: choiceKeys(map),
  timeoutMs: 200,
  pollMs: 10,
  mountWaitMs: 30,
})

const withDocument = async <T>(doc: unknown, fn: () => Promise<T>): Promise<T> => {
  const g = globalThis as { document?: unknown }
  const before = g.document
  g.document = doc
  try {
    return await fn()
  } finally {
    g.document = before
  }
}

const OPTIONS_75 = { '7-5': { F: 'G', H: 'I', O: 'P' } }
const route25 = () => [
  { route: ['1', 'C', 'D'], rate: '0.3' },
  { route: ['1', 'C', 'E', 'G', 'L', 'N'], rate: '0.42' },
  { route: ['1', 'C', 'E', 'G', 'L', 'O'], rate: '0.28' },
]

describe('compass page script', () => {
  it('returns every route with its rate as a decimal string', async () => {
    const { document } = fakeCompass({ routes: route25 })
    const result = await withDocument(document, () => compassPageScript(params('2-5')))
    expect(result).toEqual({ ok: true, routes: route25() })
  })

  it('works after serialization, as it runs in the page', async () => {
    const { document } = fakeCompass({ routes: route25 })
    const result = await withDocument(document, () => (0, eval)(buildPageScript('2-5', {})) as Promise<unknown>)
    expect(parseScriptResult(result).map((c) => c.probability)).toEqual([0.3, 0.42, 0.28])
  })

  it('applies branch choices before reading routes', async () => {
    const { document, store } = fakeCompass({
      options: structuredClone(OPTIONS_75),
      routes: (_area, o) => [{ route: ['1', 'A', 'B', 'D', 'F', o?.F ?? '?', 'N', 'O', o?.O ?? '?'], rate: '1' }],
    })
    const choices = { F: 'J', H: 'I', O: 'Q' }
    const result = await withDocument(document, () => compassPageScript(params('7-5', choices)))
    expect(result.ok && result.routes[0]?.route).toEqual(['1', 'A', 'B', 'D', 'F', 'J', 'N', 'O', 'Q'])
    expect(store.applied).toEqual([
      ['7-5', 'F', 'J'],
      ['7-5', 'H', 'I'],
      ['7-5', 'O', 'Q'],
    ])
  })

  it('reports a missing store or action as unexpected page structure', async () => {
    for (const shape of ['missing', 'no-action'] as const) {
      const { document } = fakeCompass({ shape })
      const result = await withDocument(document, () => compassPageScript(params('5-2')))
      expect(result).toMatchObject({ ok: false, code: 'COMPASS_SHAPE' })
    }
  })

  it('reports a choice key mismatch as unexpected page structure, naming map and node', async () => {
    const { document, store } = fakeCompass({ options: { '7-5': { F: 'G', H: 'I', O: 'P', X: 'Y' } }, routes: route25 })
    const result = await withDocument(document, () => compassPageScript(params('7-5')))
    expect(result).toMatchObject({ ok: false, code: 'COMPASS_SHAPE' })
    expect(!result.ok && result.details.join()).toContain('7-5')
    expect(!result.ok && result.details.join()).toContain(' X ')
    expect(store.applied).toEqual([])
  })

  it('reports an unknown area as unsupported map', async () => {
    const { document } = fakeCompass({ error: 'AreaIdの入力に誤りがあります' })
    const result = await withDocument(document, () => compassPageScript(params('8-1')))
    expect(result).toMatchObject({ ok: false, code: 'COMPASS_UNSUPPORTED_MAP' })
  })

  it('times out when no route arrives', async () => {
    const { document } = fakeCompass({})
    const result = await withDocument(document, () => compassPageScript(params('5-2')))
    expect(result).toMatchObject({ ok: false, code: 'COMPASS_TIMEOUT' })
  })
})

describe('parseScriptResult', () => {
  it('converts decimal rates and accepts a sum of 1', () => {
    const c = parseScriptResult({ ok: true, routes: [{ route: ['1', 'A'], rate: '0.333' }, { route: ['1', 'B'], rate: '0.667' }] })
    expect(c).toEqual([
      { nodes: ['1', 'A'], probability: 0.333 },
      { nodes: ['1', 'B'], probability: 0.667 },
    ])
  })

  it('rejects rates that do not add up to 1', () => {
    expect(() => parseScriptResult({ ok: true, routes: [{ route: ['1', 'A'], rate: '0.5' }] })).toThrow(SimError)
  })

  it('rethrows the typed error from the page', () => {
    const err = (() => {
      try {
        parseScriptResult({ ok: false, code: 'COMPASS_TIMEOUT', message: 'm', details: [] })
      } catch (e) {
        return e as SimError
      }
    })()
    expect(err?.code).toBe('COMPASS_TIMEOUT')
  })
})

describe('runCompass', () => {
  /** A `<webview>` stand-in that fails to load, or answers with `answer`. */
  const fakeWebviewDocument = (behaviour: { fail?: boolean; answer?: unknown }) => {
    const listeners = new Map<string, (e: unknown) => void>()
    const created: Record<string, unknown>[] = []
    const body = { children: new Set<unknown>(), appendChild(el: unknown) { this.children.add(el) } }
    const doc = {
      body,
      createElement: () => {
        const attrs: Record<string, string> = {}
        const el = {
          attrs,
          src: '',
          setAttribute: (k: string, v: string) => (attrs[k] = v),
          addEventListener: (type: string, cb: (e: unknown) => void) => listeners.set(type, cb),
          remove: () => body.children.delete(el),
          executeJavaScript: async () => behaviour.answer,
        }
        created.push(el)
        setTimeout(() => {
          if (behaviour.fail) listeners.get('did-fail-load')?.({ errorCode: -106, errorDescription: 'ERR_INTERNET_DISCONNECTED', isMainFrame: true })
          else listeners.get('dom-ready')?.({})
        }, 5)
        return el
      },
    }
    return { doc, created, body }
  }

  const deck = () => toDeckbuilder(snapshotFleet(loadStore(), 1))

  it('maps a failed page load to page unreachable and removes the webview', async () => {
    const { doc, created, body } = fakeWebviewDocument({ fail: true })
    const err = await withDocument(doc, () => runCompass(deck(), '5-2', {}).catch((e: unknown) => e))
    expect((err as SimError).code).toBe('COMPASS_UNREACHABLE')
    expect(body.children.size).toBe(0)
    expect((created[0]?.attrs as Record<string, string>).partition).toBe(COMPASS_PARTITION)
  })

  it('loads only the compass page, in its own non-persistent partition', async () => {
    const { doc, created, body } = fakeWebviewDocument({ answer: { ok: true, routes: [{ route: ['1', 'A'], rate: '1' }] } })
    const result = await withDocument(doc, () => runCompass(deck(), '5-2', {}))
    expect(result).toEqual([{ nodes: ['1', 'A'], probability: 1 }])
    expect(new URL(created[0]?.src as string).host).toBe('x-20a.github.io')
    expect(COMPASS_PARTITION.startsWith('persist:')).toBe(false)
    expect(body.children.size).toBe(0)
  })

  it('puts the fleet in the URL as pdz', () => {
    const url = new URL(compassUrl(deck()))
    expect(url.pathname).toBe('/compass/')
    expect(url.searchParams.get('pdz')).toBeTruthy()
  })
})

describe('boss marking', () => {
  const dataDir = join(__dirname, 'fixtures', 'data')

  it('marks a 2-5 candidate ending at D as not reaching the boss', async () => {
    const bosses = bossLettersFor(await loadBossLetters(dataDir), '2-5')
    expect(bosses).toEqual(['O'])
    expect(endsAtBoss(['1', 'C', 'D'], bosses)).toBe(false)
    expect(endsAtBoss(['1', 'C', 'E', 'G', 'L', 'O'], bosses)).toBe(true)
  })

  it('accepts any of several boss nodes', async () => {
    const bosses = bossLettersFor(await loadBossLetters(dataDir), '7-5')
    expect(endsAtBoss(['1', 'A', 'F', 'G', 'H', 'K'], bosses)).toBe(true)
  })
})

describe('applyTarget', () => {
  const predicted = [
    { nodes: ['1', 'C', 'D'], probability: 0.3, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28, endsAtBoss: true },
  ]
  const total = (rs: { probability: number }[]) => rs.reduce((sum, r) => sum + r.probability, 0)

  it('leaves every route as it is for the Boss target', () => {
    const rs = applyTarget(predicted, undefined, ['O'])
    expect(rs.map((r) => [r.nodes.join('-'), r.probability, r.reachesTarget])).toEqual([
      ['1-C-D', 0.3, false],
      ['1-C-E-G-L-N', 0.42, false],
      ['1-C-E-G-L-O', 0.28, true],
    ])
  })

  it('cuts routes at a node target and merges those that become the same', () => {
    const rs = applyTarget(predicted, 'E', ['O'])
    expect(rs.map((r) => [r.nodes.join('-'), r.probability, r.reachesTarget, r.endsAtBoss])).toEqual([
      ['1-C-D', 0.3, false, false],
      ['1-C-E', 0.7, true, false],
    ])
    expect(total(rs)).toBeCloseTo(1, 6)
  })

  it('marks every route as missing a target that no route passes, and cuts none', () => {
    const rs = applyTarget(predicted, 'K', ['O'])
    expect(rs.map((r) => [r.nodes.length, r.reachesTarget])).toEqual([
      [3, false],
      [6, false],
      [6, false],
    ])
  })

  it('only looks from the node the fleet is at on', () => {
    const narrowed = predicted.slice(1).map((r) => ({ ...r, probability: r.probability / 0.7, from: 3 }))
    const atTarget = applyTarget(narrowed, 'L', ['O'])
    expect(atTarget.map((r) => [r.nodes.join('-'), r.reachesTarget, r.from])).toEqual([['1-C-E-G-L', true, 3]])
    expect(atTarget[0]!.probability).toBeCloseTo(1, 6)
    // C is behind the fleet: reached, cut there and merged, but its battle is over.
    const passed = applyTarget(narrowed, 'C', ['O'])
    expect(passed.map((r) => [r.nodes.join('-'), r.reachesTarget, r.passedTarget])).toEqual([['1-C', true, true]])
    expect(passed[0]!.probability).toBeCloseTo(1, 6)
    expect(atTarget[0]!.passedTarget).toBeUndefined()
  })
})

describe('kcnav topology', () => {
  const kcnavDir = join(__dirname, 'fixtures', 'kcnav')

  it("tells 2-5's battle nodes from maelstroms and pass-through nodes, as the optimizer does", () => {
    expect([...battleNodes(topologyNow(kcnavDir, '2-5')!)].sort()).toEqual(['B', 'C', 'E', 'F', 'J', 'L', 'O'])
  })

  it('counts a node as a battle when any counted edge into it says so, and skips unknown ids', () => {
    const route = {
      0: [null, '1', 0, 0],
      1: ['1', 'A', 90, 6],
      2: ['1', 'B', 4, 4],
      3: ['A', 'B', 90, 6],
      4: ['1', 'C', 0, -1],
      5: ['C', 'D', 0, -1],
      6: ['C', 'D', 90, 2],
    }
    expect([...battleNodes(route)].sort()).toEqual(['B', 'C'])
  })

  it('has no topology for a map not fetched yet', () => {
    expect(topologyNow(kcnavDir, '1-1')).toBeUndefined()
  })

  it('finds night-battle nodes by the majority colour of the edges into them, as the optimizer does', () => {
    // 5-3's P and K, as cached: every edge into them is colour 11.
    const route = {
      0: [null, '1', 0, 0],
      1: ['O', 'P', 11, 4],
      2: ['O', 'K', 11, 4],
      3: ['P', 'K', 11, 4],
      // A vote: two night-battle edges against one normal one.
      4: ['1', 'X', 11, 4],
      5: ['P', 'X', 11, 4],
      6: ['K', 'X', 4, 4],
      // A tie goes to the smaller colour, a normal battle.
      7: ['1', 'Y', 11, 4],
      8: ['P', 'Y', 4, 4],
      // Unknown colours don't vote.
      9: ['1', 'Z', -1, 4],
      10: ['P', 'Z', 11, 4],
    }
    expect([...nightOnlyNodes(route)].sort()).toEqual(['K', 'P', 'X', 'Z'])
    expect(nightOnlyNodes(topologyNow(kcnavDir, '2-5')!).size).toBe(0)
  })
})

describe('predictor', () => {
  afterEach(() => vi.restoreAllMocks())
  const deck = () => toDeckbuilder(snapshotFleet(loadStore(), 1))

  it('caches by map, choices and fleet, and does not cache failures', async () => {
    let calls = 0
    let failNext = true
    const predictor = createPredictor(async () => {
      calls++
      if (failNext) {
        failNext = false
        throw new SimError('COMPASS_TIMEOUT', 'slow')
      }
      return [{ nodes: ['1', 'C', 'D'], probability: 1 }]
    })
    const input = { deck: deck(), map: '2-5', choices: {}, bossLetters: ['O'] }
    await expect(predictor.predict(input)).rejects.toBeInstanceOf(SimError)
    const first = await predictor.predict(input)
    const second = await predictor.predict(input)
    expect(calls).toBe(2)
    expect(second).toEqual(first)
    expect(first[0]?.endsAtBoss).toBe(false)

    await predictor.predict({ ...input, map: '5-2' })
    expect(calls).toBe(3)
  })

  it('keeps the uncut routes, so a target change reuses the prediction, and gives the node options', async () => {
    let calls = 0
    const predictor = createPredictor(async () => {
      calls++
      return [
        { nodes: ['1', 'C', 'D'], probability: 0.3 },
        { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42 },
        { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28 },
      ]
    })
    const input = { deck: deck(), map: '2-5', choices: {}, bossLetters: ['O'] }
    expect(predictor.nodesFor('2-5')).toEqual([])
    const routes = await predictor.predict(input)
    expect(applyTarget(routes, undefined, ['O']).filter((r) => r.reachesTarget)).toHaveLength(1)
    expect(applyTarget(await predictor.predict(input), 'E', ['O'])).toHaveLength(2)
    expect(calls).toBe(1)
    expect(predictor.nodesFor('2-5')).toEqual(['C', 'D', 'E', 'G', 'L', 'N'])
    // Mid-sortie at E: C is passed and D can no longer be reached.
    expect(predictor.nodesFor('2-5', ['1', 'C', 'E'])).toEqual(['E', 'G', 'L', 'N'])
    expect(predictor.bossFor('2-5')).toEqual(['O'])
    expect(predictor.bossFor('5-2')).toBeUndefined()
  })

  it("names the bosses the routes end at, or all the map's when none does", async () => {
    let routes = [{ nodes: ['1', 'A', 'B', 'C', 'D', 'F'], probability: 1 }]
    const predictor = createPredictor(async () => routes)
    const input = { deck: deck(), map: '7-3', choices: { phase: '1' }, bossLetters: ['E', 'P'] }
    await predictor.predict(input)
    expect(predictor.bossFor('7-3')).toEqual(['E', 'P'])
    routes = [{ nodes: ['1', 'A', 'B', 'C', 'D', 'G', 'I', 'L', 'M', 'P'], probability: 1 }]
    await predictor.predict({ ...input, choices: { phase: '2' } })
    expect(predictor.bossFor('7-3')).toEqual(['P'])
  })

  it('ignores proficiency and luck but not levels or improvement', () => {
    const base = deck()
    const key = predictionKey(base, '5-2', {})
    const tweak = (fn: (d: ReturnType<typeof deck>) => void) => {
      const d = structuredClone(base)
      fn(d)
      return predictionKey(d, '5-2', {})
    }
    expect(tweak((d) => (d.f1.s1!.items.i1!.mas = 0))).toBe(key)
    expect(tweak((d) => (d.f1.s1!.luck = 99))).toBe(key)
    expect(tweak((d) => (d.f1.s1!.lv = 1))).not.toBe(key)
    expect(tweak((d) => (d.f1.s1!.items.i1!.rf = 9))).not.toBe(key)
  })

  it('gives a different key for a different branch choice', () => {
    const d = deck()
    expect(predictionKey(d, '7-5', { F: 'G', H: 'I', O: 'P' })).not.toBe(predictionKey(d, '7-5', { F: 'J', H: 'I', O: 'P' }))
    expect(predictionKey(d, '7-3', { phase: '1' })).not.toBe(predictionKey(d, '7-3', { phase: '2' }))
  })

  it('never makes a network request of its own', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const predictor = createPredictor(async () => [{ nodes: ['1', 'O'], probability: 1 }])
    await predictor.predict({ deck: deck(), map: '5-2', choices: {}, bossLetters: ['O'] })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('choices table', () => {
  it('has three 7-5 branches defaulting to compass and a phase for 5-6 and 7-3', () => {
    expect(choiceKeys('7-5')).toEqual(['F', 'H', 'O'])
    expect(defaultChoices('7-5')).toEqual({ F: 'G', H: 'I', O: 'P' })
    expect(choiceKeys('5-6')).toEqual(['I', 'O', 'phase'])
    expect(defaultChoices('7-3')).toEqual({ phase: '1' })
    expect(choiceKeys('5-2')).toEqual([])
  })

  it('replaces stale saved values with defaults', () => {
    expect(normalizeChoices('7-5', { F: 'J', H: 'Z', extra: 'x' })).toEqual({ F: 'J', H: 'I', O: 'P' })
    expect(normalizeChoices('7-3', { phase: '9' })).toEqual({ phase: '1' })
  })
})
