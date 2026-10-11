import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SimError } from '../src/errors'
import { applyTarget } from '../src/routes/boss'
import { cellLetters, cellLettersNow, narrowToPath, sortieOf, takenBranches } from '../src/routes/sortie'

const kcnav = join(__dirname, 'fixtures', 'kcnav')
const out = (fleet: number, extra = {}) => ({
  sortie: {
    sortieStatus: [1, 2, 3, 4].map((id) => id === fleet),
    sortieMapId: '25',
    spotHistory: [0, 3, 5],
    ...extra,
  },
})

describe('sortieOf', () => {
  it('reads the map and cells while the fleet is out', () => {
    expect(sortieOf(out(1), 1)).toEqual({ map: '2-5', cells: [0, 3, 5] })
  })

  it('is undefined at home, for another fleet, or without the slice', () => {
    expect(sortieOf({ sortie: { sortieStatus: [false, false, false, false] } }, 1)).toBeUndefined()
    expect(sortieOf(out(2), 1)).toBeUndefined()
    expect(sortieOf({}, 1)).toBeUndefined()
    expect(sortieOf(undefined, 1)).toBeUndefined()
  })

  it('reads a combined fleet for fleet 1', () => {
    expect(sortieOf({ sortie: { ...out(1).sortie, sortieStatus: [true, true, false, false] } }, 1)?.map).toBe('2-5')
  })

  it('leaves event maps to the selected map', () => {
    expect(sortieOf(out(1, { sortieMapId: '601' }), 1)).toBeUndefined()
  })
})

describe('cellLetters', () => {
  it('turns cells into the letters they enter', async () => {
    expect(await cellLetters(kcnav, { map: '2-5', cells: [0, 3, 5, 7] })).toEqual(['1', 'C', 'E', 'G'])
  })

  it('fails as unreadable for an unknown cell or a missing map', async () => {
    await expect(cellLetters(kcnav, { map: '2-5', cells: [0, 99] })).rejects.toMatchObject({
      code: 'SORTIE_MAP_UNREADABLE',
    })
    await expect(cellLetters(kcnav, { map: '3-1', cells: [0, 1] })).rejects.toBeInstanceOf(SimError)
  })
})

describe('cellLettersNow', () => {
  it('reads the same letters synchronously, and is undefined without the topology', () => {
    expect(cellLettersNow(kcnav, { map: '2-5', cells: [0, 3, 5] })).toEqual(['1', 'C', 'E'])
    expect(cellLettersNow(kcnav, { map: '3-1', cells: [0, 1] })).toBeUndefined()
    expect(cellLettersNow(kcnav, { map: '2-5', cells: [0, 99] })).toBeUndefined()
  })
})

describe('takenBranches', () => {
  it('gives the branch taken at each chosen node passed', () => {
    expect(takenBranches('5-3', ['1', 'D', 'G', 'I', 'O', 'P'])).toEqual({ O: 'P' })
    expect(takenBranches('7-5', ['1', 'A', 'B', 'F', 'J'])).toEqual({ F: 'J' })
  })

  it('leaves out a chosen node not passed yet, or the one the fleet is at', () => {
    expect(takenBranches('5-3', ['1', 'D', 'G', 'I'])).toEqual({})
    expect(takenBranches('5-3', ['1', 'D', 'G', 'I', 'O'])).toEqual({})
    expect(takenBranches('2-5', ['1', 'C', 'E'])).toEqual({})
  })
})

describe('narrowToPath', () => {
  const candidates = [
    { nodes: ['1', 'C', 'D'], probability: 0.3, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28, endsAtBoss: true },
  ]

  it('keeps the routes through the path, scaled to add up to 1', () => {
    const kept = narrowToPath(candidates, ['1', 'C', 'E'], '2-5')
    expect(kept.map((c) => c.nodes.at(-1))).toEqual(['N', 'O'])
    expect(kept[0]!.probability).toBeCloseTo(0.6)
    expect(kept[1]!.probability).toBeCloseTo(0.4)
  })

  it('leaves one route at 1 at the boss', () => {
    expect(narrowToPath(candidates, ['1', 'C', 'E', 'G', 'L', 'O'], '2-5')).toEqual([{ ...candidates[2], probability: 1 }])
  })

  it('fails when no route passes the path', () => {
    expect(() => narrowToPath(candidates, ['1', 'B'], '2-5')).toThrow(
      expect.objectContaining({ code: 'SORTIE_PATH_UNMATCHED' }),
    )
  })
})

describe('a node target mid-sortie', () => {
  const candidates = [
    { nodes: ['1', 'C', 'D'], probability: 0.3, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'N'], probability: 0.42, endsAtBoss: false },
    { nodes: ['1', 'C', 'E', 'G', 'L', 'O'], probability: 0.28, endsAtBoss: true },
  ]
  /** As the runner does: narrow the uncut routes, then cut from the node the fleet is at. */
  const run = (letters: string[], target: string) =>
    applyTarget(
      narrowToPath(candidates, letters, '2-5').map((c) => ({ ...c, from: letters.length - 1 })),
      target,
      ['O'],
    ).map((c) => [c.nodes.join('-'), Number(c.probability.toFixed(6)), c.reachesTarget, c.passedTarget ?? false])

  it('narrows first, then cuts at a target ahead', () => {
    expect(run(['1', 'C', 'E'], 'L')).toEqual([['1-C-E-G-L', 1, true, false]])
  })

  it('cuts at the node the fleet is at when that is the target', () => {
    expect(run(['1', 'C', 'E'], 'E')).toEqual([['1-C-E', 1, true, false]])
  })

  it('cuts at a target the fleet has passed, as reached but not to simulate', () => {
    expect(run(['1', 'C', 'E', 'G'], 'E')).toEqual([['1-C-E', 1, true, true]])
  })
})
