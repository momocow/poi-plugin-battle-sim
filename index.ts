/**
 * poi plugin entry point: one panel. Every run starts from the panel, by its
 * Simulate button or a change to the fleet or map; the only work that
 * outlives a run is a map's shared kcnav fetch, which is killed when poi
 * unloads the plugin.
 */
import { stopPrefetch } from './src/optimizer/prefetch'
import { Panel } from './src/ui/Panel'

export const windowMode = false

export const reactClass = Panel

export { Settings as settingsClass } from './src/ui/Settings'

/**
 * Bring the tab forward on entering the remodel screen (which requests
 * can_preset_slot_select) and on any change to a ship or its equipment, so the
 * automatic run triggered by that change is in view.
 *
 * Declaring this is also what makes poi offer its own "Enable auto switch"
 * checkbox for this plugin, stored at `poi.autoswitch.poi_battle_sim` and on
 * by default. The switch is poi's to own, so the plugin does not reimplement one.
 */
export const switchPluginPath = [
  '/kcsapi/api_req_kaisou/can_preset_slot_select',
  '/kcsapi/api_req_hensei/change',
  '/kcsapi/api_req_hensei/preset_select',
  '/kcsapi/api_req_kaisou/remodeling',
  '/kcsapi/api_req_kaisou/powerup',
  '/kcsapi/api_req_kaisou/slotset',
  '/kcsapi/api_req_kaisou/slotset_ex',
  '/kcsapi/api_req_kaisou/unsetslot_all',
  '/kcsapi/api_req_kaisou/slot_exchange_index',
  '/kcsapi/api_req_kaisou/slot_deprive',
  '/kcsapi/api_req_kaisou/open_exslot',
]

export const pluginWillUnload = (): void => stopPrefetch()
