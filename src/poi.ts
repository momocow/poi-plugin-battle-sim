/**
 * Adapter over the poi globals this plugin reads.
 *
 * These are read from `window` rather than imported from `views/env` or
 * `views/create-store`: those modules export different things between poi's
 * development tree and its released build, while the `window` globals exist in
 * both.
 */

type PoiWindow = {
  getStore?: unknown
  config?: { get?: unknown; set?: unknown }
  APPDATA_PATH?: unknown
  ROOT?: unknown
  i18n?: Record<string, { __?: unknown } | undefined>
}

const poiWindow = (): PoiWindow =>
  typeof window !== 'undefined' && window !== null ? (window as unknown as PoiWindow) : {}

export function getStoreState(): unknown {
  const getStore = poiWindow().getStore
  return typeof getStore === 'function' ? (getStore as () => unknown)() : undefined
}

/** poi's data directory, where this plugin keeps its writable state. */
export function appDataPath(): string | undefined {
  const value = poiWindow().APPDATA_PATH
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** poi's install root, for its bundled assets (e.g. proficiency images). */
export function poiRoot(): string | undefined {
  const value = poiWindow().ROOT
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function readConfig<T>(key: string, fallback: T): T {
  const get = poiWindow().config?.get
  if (typeof get !== 'function') return fallback
  try {
    const value = (get as (k: string, f: T) => unknown)(key, fallback)
    return value === undefined || value === null ? fallback : (value as T)
  } catch {
    return fallback
  }
}

/** Best-effort: an unsaved setting is never worth failing the caller over. */
export function writeConfig(key: string, value: unknown): void {
  const set = poiWindow().config?.set
  if (typeof set !== 'function') return
  try {
    ;(set as (k: string, v: unknown) => unknown)(key, value)
  } catch {
    // ignored on purpose
  }
}

/** Translate through one of poi's i18n namespaces, falling back to the key. */
export function translateIn(namespace: string, str: string): string {
  const __ = poiWindow().i18n?.[namespace]?.__
  return typeof __ === 'function' ? (__ as (s: string) => string)(str) : str
}
