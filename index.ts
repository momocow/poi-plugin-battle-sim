/**
 * poi plugin entry point: one panel, no background work. Every run starts
 * from the panel's Simulate button.
 */
import { Panel } from './src/ui/Panel'

export const windowMode = false

export const reactClass = Panel

export { Settings as settingsClass } from './src/ui/Settings'
