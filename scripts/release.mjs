// Release the plugin and its platform packages at one version.
//
//   node scripts/release.mjs <version> [--notes <file>] [--dry-run]
//
// Bumps package.json, its optionalDependencies and every
// platforms/*/package.json to <version>; fills the binaries and data
// (fetch-optimizer, which the tests need); runs the typecheck and tests;
// publishes each platform package, then refreshes the lockfile from the
// registry; makes the one `🔖 Release <version>` commit (body from the --notes
// file, else written in the editor) and its lightweight v<version> tag;
// publishes the main package; and pushes main and the tag. Only the release
// files may be uncommitted beforehand, since the bump lives in the working
// tree until this commit.
//
// Safe to re-run after a failure: published packages, an existing release
// commit and tag are skipped. --dry-run does the bump and checks, runs
// `npm publish --dry-run` for every package, and stops before the lockfile,
// commit, tag and push.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n')
const fail = (message) => {
  console.error(`release: ${message}`)
  process.exit(1)
}
const step = (message) => console.log(`\n== ${message}`)
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' })
  if (r.error) fail(`${cmd} could not be started: ${r.error.message}`)
  if (r.status !== 0) fail(`${cmd} ${args.join(' ')} exited with ${r.status}`)
}
const read = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' })
  return { ok: !r.error && r.status === 0, out: (r.stdout ?? '').trimEnd() }
}
const git = (...args) => read('git', args)
const isPublished = (name, version) => read('npm', ['view', `${name}@${version}`, 'version']).out === version

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { notes: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } },
})
const dryRun = opts['dry-run']
const version = positionals[0]
if (positionals.length !== 1 || !/^\d+\.\d+\.\d+$/.test(version)) {
  fail('usage: node scripts/release.mjs <x.y.z> [--notes <file>] [--dry-run]')
}
const notes = opts.notes && resolve(opts.notes)
if (notes && !existsSync(notes)) fail(`${opts.notes} does not exist`)
const tag = `v${version}`
const subject = `🔖 Release ${version}`

const pkgPath = join(root, 'package.json')
const keys = readdirSync(join(root, 'platforms'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
const platformPkgPath = (k) => join(root, 'platforms', k, 'package.json')
const releaseFiles = ['package.json', 'package-lock.json', 'optimizer.json', ...keys.map((k) => `platforms/${k}/package.json`)]

// Preflight: the right branch, nothing else uncommitted, not behind origin, the version moves forward.
step('Preflight')
const pkg = readJson(pkgPath)
const released = git('log', '-1', '--format=%s').out === subject
if (git('branch', '--show-current').out !== 'main') fail('releases are made from main')
const dirty = git('status', '--porcelain', '--untracked-files=all').out.split('\n').filter(Boolean)
  .map((line) => line.slice(3))
  .filter((p) => !releaseFiles.includes(p) && !/^platforms\/[^/]+\/bin\//.test(p))
if (dirty.length) fail(`commit or stash these first; only release files may be uncommitted:\n  ${dirty.join('\n  ')}`)
if (!git('fetch', 'origin', 'main').ok) fail('git fetch origin main failed')
if (!git('merge-base', '--is-ancestor', 'origin/main', 'HEAD').ok) fail('main is behind origin/main')
const cmp = (a, b) => a.split('.').map(Number).reduce((r, n, i) => r || n - b.split('.').map(Number)[i], 0)
if (cmp(version, pkg.version) < 0) fail(`${version} is older than the current ${pkg.version}`)
const tagAt = git('rev-list', '-n', '1', tag)
if (tagAt.ok && tagAt.out !== git('rev-parse', 'HEAD').out) fail(`${tag} already exists on another commit`)
// A local dependency (the game-data package as `file:./fcd` before its first publish) can't be installed from npm.
const localDeps = Object.entries(pkg.dependencies ?? {}).filter(([, spec]) => String(spec).startsWith('file:'))
if (localDeps.length) fail(`depend on published versions first: ${localDeps.map(([name, spec]) => `${name}@${spec}`).join(', ')}`)
if (!read('npm', ['whoami']).ok) fail('not logged in to npm (npm login)')

step(`Bump to ${version}`)
pkg.version = version
for (const name of Object.keys(pkg.optionalDependencies ?? {})) pkg.optionalDependencies[name] = version
writeJson(pkgPath, pkg)
for (const k of keys) {
  const platformPkg = readJson(platformPkgPath(k))
  platformPkg.version = version
  writeJson(platformPkgPath(k), platformPkg)
}

step('Fetch the optimizer')
run('npm', ['run', 'fetch-optimizer'])

step('Typecheck and test')
run('npm', ['run', 'typecheck'])
run('npm', ['test'])

const publish = (dir, name) => {
  if (isPublished(name, version)) return console.log(`${name}@${version} is already published`)
  run('npm', ['publish', dir, ...(dryRun ? ['--dry-run'] : [])])
}

step('Publish the platform packages')
for (const k of keys) publish(`./platforms/${k}`, readJson(platformPkgPath(k)).name)

if (dryRun) {
  step('Publish the main package (dry run)')
  publish('.', pkg.name)
  console.log(`\nDry run done. A release would now refresh the lockfile, commit "${subject}", tag ${tag}, publish ${pkg.name} and push.`)
  process.exit(0)
}

// A just-published package can take a moment to show up in the registry.
step('Refresh the lockfile')
for (let attempt = 1; ; attempt++) {
  if (read('npm', ['install', '--package-lock-only', '--ignore-scripts']).ok) break
  if (attempt === 6) run('npm', ['install', '--package-lock-only', '--ignore-scripts'])
  console.log(`npm install failed, retrying in ${attempt * 10}s`)
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 10_000)
}

step(`Commit and tag ${tag}`)
const changed = releaseFiles.filter((p) => git('status', '--porcelain', '--', p).out)
if (changed.length) {
  if (released) fail(`HEAD is already "${subject}" but these changed since: ${changed.join(', ')}`)
  run('git', ['add', '--', ...changed])
  if (notes) {
    const message = join(mkdtempSync(join(tmpdir(), 'battle-sim-release-')), 'COMMIT_MSG')
    writeFileSync(message, `${subject}\n\n${readFileSync(notes, 'utf8').trim()}\n`)
    run('git', ['commit', '-F', message])
  } else {
    run('git', ['commit', '-e', '-m', subject])
  }
} else if (!released) {
  fail('nothing to commit and HEAD is not the release commit')
}
if (!git('rev-parse', '-q', '--verify', `refs/tags/${tag}`).ok) run('git', ['tag', tag])

step('Publish the main package')
publish('.', pkg.name)

step('Push')
run('git', ['push', 'origin', 'main', tag])
console.log(`\nReleased ${pkg.name}@${version}.`)
