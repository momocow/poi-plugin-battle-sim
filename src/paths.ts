/**
 * Where this plugin's files are: the package root (for `optimizer.json` and
 * the bundled binary and data) and the writable working directory under poi's
 * app data, which holds the optimizer's cwd, kcnav cache and logs.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { SimError } from './errors'
import { appDataPath } from './poi'

/** The nearest directory above this file with a package.json (src/ or dist/src/ both work). */
export function findPackageRoot(from = __dirname): string {
  let dir = from
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new SimError('INTERNAL', 'The plugin cannot find its own package directory.', [from])
    dir = parent
  }
  return dir
}

export function workDir(): string {
  const appData = appDataPath()
  if (!appData) throw new SimError('INTERNAL', "poi did not provide its app data path (APPDATA_PATH).")
  return join(appData, 'battle-sim')
}
