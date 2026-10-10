/**
 * poi plugin entry point: one panel. Every run starts from the panel's
 * Simulate button; the only work that outlives a run is a map's shared kcnav
 * fetch, which is killed when poi unloads the plugin.
 */
import { stopPrefetch } from './src/optimizer/prefetch'
import { Panel } from './src/ui/Panel'

export const windowMode = false

export const reactClass = Panel

export { Settings as settingsClass } from './src/ui/Settings'

export const pluginWillUnload = (): void => stopPrefetch()
