import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { kcnavDirFor, packageCovers } from '../src/gameData/kcnav'
import { readGameData, UnusableGameData } from '../src/gameData/manifest'
import { compareVersions, loadNewest, pruneSaved, savedDir, setGameData } from '../src/gameData/store'
import { BadTarball, extractTarball } from '../src/gameData/tar'
import {
  applyUpdate,
  checkForUpdate,
  CHECK_INTERVAL_MS,
  newestOfMajor,
  resetUpdateStatusForTests,
  startUpdateChecks,
  updateStatus,
} from '../src/gameData/update'
import { tempDir } from './helpers'

/** A minimal usable package at `dir`, version `version`. */
function writePackage(dir: string, version: string, patch: { mapChoices?: unknown; manifest?: unknown } = {}): string {
  mkdirSync(join(dir, 'optimizer'), { recursive: true })
  mkdirSync(join(dir, 'kcnav', '5-2'), { recursive: true })
  writeFileSync(join(dir, 'optimizer', 'maps.json'), '{"5-2":{"boss_letters":["O"]}}')
  writeFileSync(join(dir, 'kcnav', '5-2', '_map.json'), '{"route":{}}')
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'poi-plugin-battle-sim-data', version }))
  writeFileSync(
    join(dir, 'map-choices.json'),
    JSON.stringify(patch.mapChoices ?? { maps: { '7-5': { branches: [{ node: 'F', targets: ['G', 'J'], default: 'G' }] } } }),
  )
  writeFileSync(join(dir, 'node-distances.json'), '{"maps":{"6-4":{"N":6}}}')
  writeFileSync(join(dir, 'event-gauges.json'), '{"maps":{"62-3":{"4":{"2":4800}}}}')
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify(
      patch.manifest ?? {
        parts: {
          optimizer: { format: 1, path: 'optimizer' },
          mapChoices: { format: 1, path: 'map-choices.json' },
          nodeDistances: { format: 1, path: 'node-distances.json' },
          eventGauges: { format: 1, path: 'event-gauges.json' },
          kcnav: { format: 1, path: 'kcnav' },
          laterPart: { format: 9, path: 'later.json' },
        },
      },
    ),
  )
  return dir
}

/** A gzip'd ustar of `files` (path → content), as `npm pack` writes it. */
function tarball(files: Record<string, string>, opts: { type?: string } = {}): Buffer {
  const blocks: Buffer[] = []
  for (const [name, content] of Object.entries(files)) {
    const body = Buffer.from(content)
    const header = Buffer.alloc(512)
    header.write(name, 0, 100)
    header.write('0000644\0', 100)
    header.write('0000000\0', 108)
    header.write('0000000\0', 116)
    header.write(body.length.toString(8).padStart(11, '0') + '\0', 124)
    header.write('00000000000\0', 136)
    header.write(opts.type ?? '0', 156)
    header.write('ustar\0', 257)
    header.write('00', 263)
    header.fill(' ', 148, 156)
    const sum = header.reduce((a, b) => a + b, 0)
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148)
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512))
  }
  blocks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(blocks))
}

/** Every file of a package directory, as `package/<path>` → content. */
function packFiles(dir: string, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) Object.assign(out, packFiles(dir, rel))
    else out[`package/${rel}`] = readFileSync(join(dir, rel), 'utf8')
  }
  return out
}

const sri = (buf: Buffer) => `sha512-${createHash('sha512').update(buf).digest('base64')}`

describe('readGameData', () => {
  it('reads the parts it needs and ignores parts it does not know', () => {
    const data = readGameData(writePackage(tempDir(), '1.2.0'))
    expect(data.version).toBe('1.2.0')
    expect(data.mapChoices['7-5']?.branches[0]).toEqual({ node: 'F', targets: ['G', 'J'], default: 'G' })
    expect(data.nodeDistances).toEqual({ '6-4': { N: 6 } })
    expect(data.eventGauges).toEqual({ '62-3': { '4': { '2': 4800 } } })
  })

  it('rejects a branch default that is not one of its targets', () => {
    const dir = writePackage(tempDir(), '1.0.0', {
      mapChoices: { maps: { '7-5': { branches: [{ node: 'F', targets: ['G', 'J'], default: 'Q' }] } } },
    })
    expect(() => readGameData(dir)).toThrow(UnusableGameData)
  })

  it('rejects a needed part in a format this plugin cannot read, or missing', () => {
    const dir = writePackage(tempDir(), '1.0.0')
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    manifest.parts.mapChoices.format = 2
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest))
    expect(() => readGameData(dir)).toThrow(/format 2/)
    delete manifest.parts.mapChoices
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest))
    expect(() => readGameData(dir)).toThrow(/no "mapChoices" part/)
  })

  it('reads the package in fcd/', () => {
    const data = readGameData(join(__dirname, '..', 'fcd'))
    expect(data.mapChoices['5-6']?.phases).toHaveLength(3)
    expect(existsSync(join(data.kcnavDir, '5-2', '_map.json'))).toBe(true)
  })
})

describe('version in use', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('uses a saved version newer than the bundled one, skipping an unusable one and other majors', () => {
    const bundled = writePackage(tempDir(), '1.0.0')
    const work = tempDir()
    writePackage(join(savedDir(work), '1.3.0'), '1.3.0')
    writePackage(join(savedDir(work), '1.4.0'), '1.4.0')
    writeFileSync(join(savedDir(work), '1.4.0', 'manifest.json'), '{broken')
    writePackage(join(savedDir(work), '2.0.0'), '2.0.0')
    expect(loadNewest({ bundled, work }).version).toBe('1.3.0')
  })

  it('uses the bundled version when it is newer than every saved one', () => {
    const bundled = writePackage(tempDir(), '1.5.0')
    const work = tempDir()
    writePackage(join(savedDir(work), '1.3.0'), '1.3.0')
    expect(loadNewest({ bundled, work }).version).toBe('1.5.0')
  })

  it('deletes saved versions older than the one in use', () => {
    const work = tempDir()
    writePackage(join(savedDir(work), '1.1.0'), '1.1.0')
    writePackage(join(savedDir(work), '1.3.0'), '1.3.0')
    pruneSaved(work, '1.3.0')
    expect(existsSync(join(savedDir(work), '1.1.0'))).toBe(false)
    expect(existsSync(join(savedDir(work), '1.3.0'))).toBe(true)
  })
})

describe('extractTarball', () => {
  it('unpacks the files under package/', () => {
    const dest = tempDir()
    extractTarball(tarball({ 'package/a/b.json': '{}', 'package/c.txt': 'x' }), dest)
    expect(readFileSync(join(dest, 'a', 'b.json'), 'utf8')).toBe('{}')
    expect(readFileSync(join(dest, 'c.txt'), 'utf8')).toBe('x')
  })

  it('rejects paths that leave the directory, links, and too much data', () => {
    expect(() => extractTarball(tarball({ 'package/../evil': 'x' }), tempDir())).toThrow(BadTarball)
    expect(() => extractTarball(tarball({ '/etc/evil': 'x' }), tempDir())).toThrow(BadTarball)
    expect(() => extractTarball(tarball({ 'package/link': 'x' }, { type: '2' }), tempDir())).toThrow(BadTarball)
    expect(() => extractTarball(tarball({ 'package/big': 'x'.repeat(100) }), tempDir(), 10)).toThrow(BadTarball)
    expect(() => extractTarball(Buffer.from('not gzip'), tempDir())).toThrow(BadTarball)
  })
})

describe('update', () => {
  afterEach(() => {
    resetUpdateStatusForTests()
    setGameData(undefined)
    vi.useRealTimers()
  })

  /** In use 1.0.0; the registry has 1.4.0 (a real tarball) and 2.0.0. */
  const setup = (opts: { integrity?: string } = {}) => {
    const work = tempDir()
    setGameData(readGameData(writePackage(tempDir(), '1.0.0')))
    const pack = tarball(packFiles(writePackage(tempDir(), '1.4.0')))
    const packument = {
      versions: {
        '1.4.0': { dist: { tarball: 'https://r/1.4.0.tgz', integrity: opts.integrity ?? sri(pack) } },
        '1.4.1-beta.1': { dist: { tarball: 'https://r/b.tgz', integrity: sri(pack) } },
        '2.0.0': { dist: { tarball: 'https://r/2.0.0.tgz', integrity: sri(pack) } },
      },
    }
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('.tgz')
        ? { ok: true, status: 200, json: async () => ({}), arrayBuffer: async () => new Uint8Array(pack).buffer as ArrayBuffer }
        : { ok: true, status: 200, json: async () => packument, arrayBuffer: async () => new ArrayBuffer(0) },
    )
    return { work, fetch }
  }

  it('takes the newest version with the same major, skipping prereleases', () => {
    const v = (s: string) => ({ dist: { tarball: s, integrity: 'sha512-x' } })
    expect(newestOfMajor({ versions: { '1.2.0': v('a'), '1.10.0': v('b'), '1.11.0-rc.1': v('c'), '2.0.0': v('d') } }, 1)?.version).toBe('1.10.0')
  })

  it('finds an available version without downloading it', async () => {
    const { work, fetch } = setup()
    await checkForUpdate({ work, fetch })
    expect(updateStatus().available?.version).toBe('1.4.0')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(existsSync(join(savedDir(work), '1.4.0'))).toBe(false)
  })

  it('offers nothing when the newest version is already saved', async () => {
    const { work, fetch } = setup()
    writePackage(join(savedDir(work), '1.4.0'), '1.4.0')
    await checkForUpdate({ work, fetch })
    expect(updateStatus().available).toBeUndefined()
  })

  it('shows no error when the registry cannot be reached', async () => {
    const { work } = setup()
    await checkForUpdate({ work, fetch: async () => Promise.reject(new Error('offline')) })
    expect(updateStatus()).toEqual({ phase: 'idle' })
  })

  it('downloads, verifies, saves and switches to the version on approval', async () => {
    const { work, fetch } = setup()
    await checkForUpdate({ work, fetch })
    await applyUpdate({ work, fetch })
    expect(updateStatus()).toEqual({ phase: 'done', installed: '1.4.0' })
    expect(readGameData(join(savedDir(work), '1.4.0')).version).toBe('1.4.0')
  })

  it('saves nothing and reports the failure when the hash does not match', async () => {
    const { work, fetch } = setup({ integrity: 'sha512-AAAA' })
    await checkForUpdate({ work, fetch })
    await applyUpdate({ work, fetch })
    expect(updateStatus()).toMatchObject({ phase: 'failed', available: { version: '1.4.0' } })
    expect(updateStatus().error).toMatch(/integrity/)
    expect(existsSync(join(savedDir(work), '1.4.0'))).toBe(false)
  })

  it('offers a newer version found later instead', async () => {
    const { work, fetch } = setup()
    await checkForUpdate({ work, fetch })
    const later = { versions: { '1.5.0': { dist: { tarball: 'https://r/1.5.0.tgz', integrity: 'sha512-x' } } } }
    await checkForUpdate({ work, fetch: async () => ({ ok: true, status: 200, json: async () => later, arrayBuffer: async () => new ArrayBuffer(0) }) })
    expect(updateStatus().available?.version).toBe('1.5.0')
  })

  it('checks at start and again every interval', async () => {
    vi.useFakeTimers()
    const { work, fetch } = setup()
    startUpdateChecks({ work, fetch })
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('kcnav directory', () => {
  it("reads a covered map from the package, and anything else from the plugin's own fetches", () => {
    const dir = writePackage(tempDir(), '1.0.0')
    mkdirSync(join(dir, 'kcnav', '62-3', 'd4-g2-c0-Lx'), { recursive: true })
    writeFileSync(join(dir, 'kcnav', '62-3', '_map.json'), '{}')
    const data = readGameData(dir)
    expect(packageCovers(data, '5-2')).toBe(true)
    expect(kcnavDirFor(data, '/work', '5-2')).toBe(data.kcnavDir)
    expect(kcnavDirFor(data, '/work', '1-1')).toBe(join('/work', 'kcnav'))
    expect(kcnavDirFor(data, '/work', '62-3', 'd4-g2-c0-Lx')).toBe(data.kcnavDir)
    expect(kcnavDirFor(data, '/work', '62-3', 'd4-g1-c0-Lx')).toBe(join('/work', 'kcnav'))
    expect(packageCovers(undefined, '5-2')).toBe(false)
  })
})
