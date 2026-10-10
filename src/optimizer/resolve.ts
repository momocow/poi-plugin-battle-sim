/**
 * Which optimizer binary and game-data directory to use.
 *
 * `optimizer.json` pins the optimizer version and, per `<platform>-<arch>`,
 * the npm package that carries that platform's binary (an optional dependency
 * of this plugin, installed only on matching machines), the binary's path in
 * it and its SHA-256. The game data ships in this package. The binary is hashed
 * once per poi session before first use. A development override (a local
 * binary and optionally its data directory, see `ui/inputs.ts`) replaces the
 * pinned asset; the hash check is skipped for it and the result says so.
 */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, constants } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path'

import { SimError } from '../errors'

export interface OptimizerManifest {
  version: string
  /** Game-data directory, relative to the package root. */
  data: string
  /** Per `<platform>-<arch>`: the platform package, the binary's path inside it, and its SHA-256. */
  assets: Record<string, { package: string; path: string; sha256: string }>
}

export interface ResolvedOptimizer {
  binPath: string
  dataDir: string
  version: string
  /** True when the development override is in use. */
  dev: boolean
}

export interface ResolveInput {
  packageRoot: string
  manifest: OptimizerManifest
  /** Development override; an empty `bin` means none. */
  override?: { bin?: string; data?: string }
  platform: string
  arch: string
  /** Injected for tests; defaults to hashing the file on disk. */
  sha256?: (path: string) => Promise<string>
}

const verified = new Map<string, Promise<void>>()

/** Forget the per-session checksum results (tests only). */
export function resetVerifiedForTests(): void {
  verified.clear()
}

export async function resolveOptimizer(input: ResolveInput): Promise<ResolvedOptimizer> {
  const { packageRoot, manifest, override } = input
  const abs = (p: string) => (isAbsolute(p) ? p : resolvePath(packageRoot, p))

  const devBin = override?.bin
  if (devBin) {
    const binPath = abs(devBin)
    await ensureExists(binPath)
    return {
      binPath,
      dataDir: abs(override?.data || manifest.data),
      version: 'dev',
      dev: true,
    }
  }

  const key = `${input.platform}-${input.arch}`
  const asset = manifest.assets[key]
  if (!asset) {
    throw new SimError(
      'BINARY_UNSUPPORTED_PLATFORM',
      `No optimizer build is bundled for ${key}.`,
      [`Bundled platforms: ${Object.keys(manifest.assets).join(', ') || '(none)'}`],
    )
  }
  const binPath = join(platformPackageDir(packageRoot, asset.package, key), asset.path)
  await ensureExists(binPath)

  let check = verified.get(binPath)
  if (!check) {
    check = verify(binPath, asset.sha256, input.sha256 ?? hashFile)
    verified.set(binPath, check)
    // A failed check is not remembered, so a repaired install works without restarting poi.
    check.catch(() => verified.delete(binPath))
  }
  await check

  return { binPath, dataDir: abs(manifest.data), version: manifest.version, dev: false }
}

/** The installed platform package's directory, resolved as Node would from this plugin. */
function platformPackageDir(packageRoot: string, name: string, key: string): string {
  try {
    return dirname(createRequire(join(packageRoot, 'package.json')).resolve(`${name}/package.json`))
  } catch (err) {
    throw new SimError('BINARY_MISSING', `The optimizer package for ${key} is not installed.`, [
      `${name} could not be found from ${packageRoot}. Reinstalling the plugin usually fixes this.`,
      String(err),
    ])
  }
}

async function ensureExists(binPath: string): Promise<void> {
  try {
    await access(binPath, constants.X_OK)
  } catch (err) {
    throw new SimError('BINARY_MISSING', 'The optimizer binary is missing or not executable.', [
      binPath,
      String(err),
    ])
  }
}

async function verify(
  binPath: string,
  expected: string,
  sha256: (path: string) => Promise<string>,
): Promise<void> {
  const actual = await sha256(binPath)
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new SimError(
      'BINARY_CORRUPT',
      'The optimizer binary failed its integrity check; reinstall the plugin.',
      [binPath, `expected sha256 ${expected}`, `actual   sha256 ${actual}`],
    )
  }
}

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}
