// Fill the optimizer binaries and game data from the release pinned in optimizer.json.
//
// Downloads with `gh` (the optimizer repo is private, so a GitHub login with
// access is needed — users never run this; they get the files from npm),
// verifies every archive and binary against the pinned SHA-256, and places
// each binary in platforms/<key>/bin and the data in ./data (without kcnav
// caches). Also checks that optimizer.json, platforms/*/package.json and
// optionalDependencies agree, and syncs the platform package versions to the
// main package's. Runs as the main package's prepublishOnly; safe to re-run.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const fail = (message) => {
  console.error(`fetch-optimizer: ${message}`)
  process.exit(1)
}
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.error) fail(`${cmd} could not be started: ${r.error.message}`)
  if (r.status !== 0) fail(`${cmd} ${args.join(' ')} exited with ${r.status}`)
}

const manifest = readJson(join(root, 'optimizer.json'))
const pkg = readJson(join(root, 'package.json'))
const tag = `v${manifest.version}`

// optimizer.json, platforms/ and optionalDependencies must describe the same packages.
const platformDirs = readdirSync(join(root, 'platforms'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
const keys = Object.keys(manifest.assets)
const optional = pkg.optionalDependencies ?? {}
const mismatch = [
  ...keys.filter((k) => !platformDirs.includes(k)).map((k) => `optimizer.json has ${k} but platforms/${k} is missing`),
  ...platformDirs.filter((k) => !keys.includes(k)).map((k) => `platforms/${k} has no entry in optimizer.json`),
  ...keys.filter((k) => optional[manifest.assets[k].package] !== pkg.version)
    .map((k) => `optionalDependencies must have "${manifest.assets[k].package}": "${pkg.version}"`),
  ...Object.keys(optional).filter((name) => !keys.some((k) => manifest.assets[k].package === name))
    .map((name) => `optionalDependencies has ${name}, which optimizer.json does not list`),
]
for (const k of keys) {
  const platformPkg = readJson(join(root, 'platforms', k, 'package.json'))
  if (platformPkg.name !== manifest.assets[k].package) mismatch.push(`platforms/${k} is named ${platformPkg.name}, optimizer.json says ${manifest.assets[k].package}`)
}
if (mismatch.length) fail(`inconsistent packaging:\n  ${mismatch.join('\n  ')}`)

// Download (cached per version) and verify the archives.
const cache = join(root, 'node_modules', '.cache', 'battle-sim-optimizer', tag)
mkdirSync(cache, { recursive: true })
const fetchArchive = ({ name, sha256: expected }) => {
  const file = join(cache, name)
  if (!existsSync(file) || sha256(file) !== expected) {
    rmSync(file, { force: true })
    run('gh', ['release', 'download', tag, '--repo', manifest.repo, '--pattern', name, '--dir', cache])
  }
  const actual = sha256(file)
  if (actual !== expected) fail(`${name}: sha256 ${actual}, pinned ${expected}`)
  return file
}
const extract = (archive) => {
  const dir = mkdtempSync(join(tmpdir(), 'battle-sim-optimizer-'))
  run('tar', ['-xzf', archive, '-C', dir])
  return dir
}

// Data: the archive holds data/…; kcnav caches never ship (they live in poi's app data).
{
  const dir = extract(fetchArchive(manifest.dataArchive))
  if (!existsSync(join(dir, 'data', 'maps.json'))) fail('the data archive has no data/maps.json')
  rmSync(join(dir, 'data', 'kcnav'), { recursive: true, force: true })
  const target = join(root, manifest.data)
  rmSync(target, { recursive: true, force: true })
  renameSync(join(dir, 'data'), target)
  rmSync(dir, { recursive: true, force: true })
  console.log(`data → ${manifest.data}/`)
}

// Binaries: each archive holds the binary at its root, named like the asset path's basename.
for (const k of keys) {
  const asset = manifest.assets[k]
  const dir = extract(fetchArchive(asset.archive))
  const name = asset.path.split('/').pop()
  const extracted = join(dir, name)
  if (!existsSync(extracted)) fail(`${asset.archive.name} has no ${name} at its root`)
  const actual = sha256(extracted)
  if (actual !== asset.sha256) fail(`${k} binary: sha256 ${actual}, pinned ${asset.sha256}`)
  const target = join(root, 'platforms', k, asset.path)
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { force: true })
  renameSync(extracted, target)
  chmodSync(target, 0o755)
  rmSync(dir, { recursive: true, force: true })

  const platformPkgPath = join(root, 'platforms', k, 'package.json')
  const platformPkg = readJson(platformPkgPath)
  if (platformPkg.version !== pkg.version) {
    platformPkg.version = pkg.version
    writeFileSync(platformPkgPath, JSON.stringify(platformPkg, null, 2) + '\n')
  }
  console.log(`${k} → platforms/${k}/${asset.path}`)
}
