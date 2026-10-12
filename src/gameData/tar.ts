/**
 * Unpack an npm tarball (gzip'd ustar) in-process, since poi's users are
 * mostly on Windows where a `tar` on PATH can't be counted on. Only what npm
 * packs is accepted: regular files and directories under `package/`, which is
 * stripped, plus pax headers for long names. Absolute paths, `..`, links and
 * anything else are rejected rather than skipped, as is more than `maxBytes` in all.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const BLOCK = 512

export class BadTarball extends Error {
  constructor(reason: string) {
    super(`bad package tarball: ${reason}`)
    this.name = 'BadTarball'
  }
}

const text = (buf: Buffer, start: number, length: number): string => {
  const raw = buf.subarray(start, start + length)
  const end = raw.indexOf(0)
  return raw.subarray(0, end < 0 ? raw.length : end).toString('utf8')
}
const octal = (buf: Buffer, start: number, length: number): number => {
  const s = text(buf, start, length).trim()
  if (!/^[0-7]*$/.test(s)) throw new BadTarball(`bad number "${s}"`)
  return s === '' ? 0 : parseInt(s, 8)
}

/** The `path` record of a pax header block, if any. */
function paxPath(body: Buffer): string | undefined {
  let at = 0
  const s = body.toString('utf8')
  while (at < s.length) {
    const space = s.indexOf(' ', at)
    const len = Number(s.slice(at, space))
    if (!Number.isInteger(len) || len <= 0) break
    const [key, ...value] = s.slice(space + 1, at + len - 1).split('=')
    if (key === 'path') return value.join('=')
    at += len
  }
  return undefined
}

/** The path under `package/`, or a rejection. */
function inside(name: string): string | undefined {
  const parts = name.split('/').filter((p) => p !== '' && p !== '.')
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name) || parts.includes('..') || name.includes('\\')) {
    throw new BadTarball(`unsafe path "${name}"`)
  }
  if (parts[0] !== 'package') throw new BadTarball(`"${name}" is not under package/`)
  return parts.length > 1 ? parts.slice(1).join('/') : undefined
}

export function extractTarball(gz: Buffer, dest: string, maxBytes = 64 * 1024 * 1024): void {
  let tar: Buffer
  try {
    tar = gunzipSync(gz)
  } catch (err) {
    throw new BadTarball(`not gzip: ${String(err)}`)
  }
  let total = 0
  let longName: string | undefined
  for (let at = 0; at + BLOCK <= tar.length; ) {
    const header = tar.subarray(at, at + BLOCK)
    if (header.every((b) => b === 0)) break
    const size = octal(header, 124, 12)
    const type = String.fromCharCode(header[156]!) || '0'
    const body = tar.subarray(at + BLOCK, at + BLOCK + size)
    if (body.length < size) throw new BadTarball('truncated')
    at += BLOCK + Math.ceil(size / BLOCK) * BLOCK

    if (type === 'x') {
      longName = paxPath(body)
      continue
    }
    if (type === 'g') continue
    const prefix = text(header, 345, 155)
    const name = longName ?? (prefix ? `${prefix}/${text(header, 0, 100)}` : text(header, 0, 100))
    longName = undefined
    const rel = inside(name)
    if (type === '5') {
      if (rel) mkdirSync(join(dest, rel), { recursive: true })
      continue
    }
    if (type !== '0' && type !== '\0') throw new BadTarball(`"${name}" is not a regular file (type ${JSON.stringify(type)})`)
    if (!rel) throw new BadTarball(`"${name}" is not a file path`)
    total += size
    if (total > maxBytes) throw new BadTarball(`more than ${maxBytes} bytes unpacked`)
    const file = join(dest, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, body)
  }
}
