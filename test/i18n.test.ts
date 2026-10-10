import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')
const sources = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  )

/** Every string the panel passes through `t()`, the error summaries, and the phase labels. */
function usedKeys(): Set<string> {
  const keys = new Set<string>(['Battle Sim', "Simulate your fleet's odds on a map"])
  for (const file of sources('src')) {
    const text = readFileSync(join(root, file), 'utf8')
    for (const m of text.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1]!)
    if (file.endsWith('ErrorView.tsx')) for (const m of text.matchAll(/^\s+[A-Z_]+: '([^']*)',/gm)) keys.add(m[1]!)
    if (file.endsWith('choices.ts')) for (const m of text.matchAll(/label: '([^']*)'/g)) keys.add(m[1]!)
  }
  return keys
}

describe('string tables', () => {
  const keys = usedKeys()
  for (const locale of ['zh-TW', 'ja-JP', 'en-US']) {
    it(`${locale} translates every panel string`, () => {
      const table = JSON.parse(readFileSync(join(root, 'i18n', `${locale}.json`), 'utf8')) as Record<string, string>
      expect([...keys].filter((k) => !(k in table))).toEqual([])
      expect(Object.keys(table).filter((k) => !keys.has(k))).toEqual([])
    })
  }

  it('uses no key that poi would mangle (": " or a trailing ".")', () => {
    expect([...keys].filter((k) => /:\s|:$|\.\W|\.$/.test(k))).toEqual([])
  })
})
