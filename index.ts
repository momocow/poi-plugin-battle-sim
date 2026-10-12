/**
 * poi plugin entry point: one panel. Every run starts from the panel, by its
 * Simulate button or a change to the fleet or map. The work that outlives a
 * run is the kcnav fetches — a map's shared fetch, and the queue that fetches
 * the normal maps not fetched yet, started when the plugin loads — which are
 * killed when poi unloads the plugin, and the record of special attacks fired
 * in the sortie in progress, which listens to game responses while the plugin
 * is loaded.
 */
import { devLog } from './src/devlog'
import { startRecordingSpecials, stopRecordingSpecials } from './src/fleet/specials'
import { stopPrefetch } from './src/optimizer/prefetch'
import { getStoreState } from './src/poi'
import { selectedFleetChanged } from './src/ui/focus'
import { Panel } from './src/ui/Panel'
import { fetchNormalMaps } from './src/ui/runner'

export const windowMode = false

export const reactClass = Panel

export { Settings as settingsClass } from './src/ui/Settings'

/**
 * Bring the tab forward when a game response changes the selected fleet's
 * ships or equipment from what the panel last showed. HP changes (damage and
 * repairs), a change to another fleet, and entering the remodel screen leave
 * poi where it is; a repair's own run still starts in the background. poi asks
 * `valid` after the response is already in its store (see src/ui/focus.ts).
 *
 * Equipping, unequipping and remodeling reach the store only with the
 * follow-up ship3, so that is listed too. Repair paths are left out: poi
 * switches to its main view on the ndock that follows a repair, so focusing
 * on the repair would only flash the tab.
 *
 * Declaring this is also what makes poi offer its own "Enable auto switch"
 * checkbox for this plugin, stored at `poi.autoswitch.poi_battle_sim` and on
 * by default. The switch is poi's to own, so the plugin does not reimplement one.
 */
const valid = (): boolean => selectedFleetChanged(getStoreState())

export const switchPluginPath = [
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
  '/kcsapi/api_get_member/ship3',
  '/kcsapi/api_req_kousyou/remodel_slot',
].map((path) => ({ path, valid }))

export const pluginDidLoad = (): void => {
  startRecordingSpecials()
  // A missing optimizer is reported by the first run; at load it only goes to the developer log.
  fetchNormalMaps().catch((err: unknown) => devLog('prefetch.unavailable', { error: String(err) }))
}

export const pluginWillUnload = (): void => {
  stopPrefetch()
  stopRecordingSpecials()
}
