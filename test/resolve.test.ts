import { chmodSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SimError } from '../src/errors'
import { resetVerifiedForTests, resolveOptimizer, type OptimizerManifest } from '../src/optimizer/resolve'
import { tempDir } from './helpers'

/** A plugin root with the darwin-arm64 platform package installed the way npm nests it. */
const setup = () => {
  // Real path: Node's resolver follows symlinks, and macOS's temp dir is one.
  const root = realpathSync(tempDir())
  writeFileSync(join(root, 'package.json'), '{"name":"poi-plugin-battle-sim"}')
  const platformDir = join(root, 'node_modules', 'poi-plugin-battle-sim-darwin-arm64')
  mkdirSync(join(platformDir, 'bin'), { recursive: true })
  writeFileSync(join(platformDir, 'package.json'), '{"name":"poi-plugin-battle-sim-darwin-arm64"}')
  writeFileSync(join(platformDir, 'bin', 'opt'), 'binary')
  chmodSync(join(platformDir, 'bin', 'opt'), 0o755)
  const manifest: OptimizerManifest = {
    version: '1.2.3',
    assets: { 'darwin-arm64': { package: 'poi-plugin-battle-sim-darwin-arm64', path: 'bin/opt', sha256: 'abc' } },
  }
  return { root, manifest, dataDir: '/pkg/optimizer', binPath: join(platformDir, 'bin', 'opt') }
}

describe('resolveOptimizer', () => {
  beforeEach(() => resetVerifiedForTests())

  it('uses the pinned asset and checks its hash once per session', async () => {
    const { root, manifest, dataDir, binPath } = setup()
    const sha256 = vi.fn(async () => 'ABC')
    const input = { packageRoot: root, manifest, dataDir, platform: 'darwin', arch: 'arm64', sha256 }
    const first = await resolveOptimizer(input)
    await resolveOptimizer(input)
    expect(first).toEqual({ binPath, dataDir: '/pkg/optimizer', version: '1.2.3', dev: false })
    expect(sha256).toHaveBeenCalledTimes(1)
  })

  it('refuses a binary whose checksum does not match', async () => {
    const { root, manifest, dataDir } = setup()
    const err = await resolveOptimizer({
      packageRoot: root, manifest, dataDir, platform: 'darwin', arch: 'arm64', sha256: async () => 'def',
    }).catch((e: unknown) => e)
    expect((err as SimError).code).toBe('BINARY_CORRUPT')
  })

  it('reports a platform with no bundled build', async () => {
    const { root, manifest, dataDir } = setup()
    const err = await resolveOptimizer({ packageRoot: root, manifest, dataDir, platform: 'win32', arch: 'x64' }).catch(
      (e: unknown) => e,
    )
    expect((err as SimError).code).toBe('BINARY_UNSUPPORTED_PLATFORM')
  })

  it('reports a platform package that is not installed', async () => {
    const { root, manifest, dataDir } = setup()
    manifest.assets['darwin-arm64'] = { package: 'poi-plugin-battle-sim-nope', path: 'bin/opt', sha256: 'abc' }
    const err = await resolveOptimizer({ packageRoot: root, manifest, dataDir, platform: 'darwin', arch: 'arm64' }).catch(
      (e: unknown) => e,
    )
    expect((err as SimError).code).toBe('BINARY_MISSING')
    expect((err as SimError).message).toContain('darwin-arm64')
  })

  it('reports a missing binary', async () => {
    const { root, manifest, dataDir } = setup()
    manifest.assets['darwin-arm64']!.path = 'bin/nope'
    const err = await resolveOptimizer({ packageRoot: root, manifest, dataDir, platform: 'darwin', arch: 'arm64' }).catch(
      (e: unknown) => e,
    )
    expect((err as SimError).code).toBe('BINARY_MISSING')
  })

  it('uses the development override and skips the hash check', async () => {
    const { root, manifest, dataDir, binPath } = setup()
    const sha256 = vi.fn(async () => 'zzz')
    const resolved = await resolveOptimizer({
      packageRoot: root,
      manifest,
      dataDir,
      override: { bin: binPath, data: '/dev/data' },
      platform: 'linux',
      arch: 'x64',
      sha256,
    })
    expect(resolved).toMatchObject({ binPath, dataDir: '/dev/data', dev: true })
    expect(sha256).not.toHaveBeenCalled()
  })
  it("uses the package's data with a development binary and no data directory", async () => {
    const { root, manifest, dataDir, binPath } = setup()
    const resolved = await resolveOptimizer({ packageRoot: root, manifest, dataDir, override: { bin: binPath }, platform: 'linux', arch: 'x64' })
    expect(resolved).toMatchObject({ dataDir: '/pkg/optimizer', dev: true })
  })
})
