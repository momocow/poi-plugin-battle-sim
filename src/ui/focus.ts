/**
 * Whether a game response changed the selected fleet as the panel last showed
 * it, which is when poi's auto switch should bring the plugin's tab forward.
 *
 * The panel records the selected fleet's setup after each render. poi
 * reduces a response into its store and only then fires `game.response`, in
 * the same task, so when poi asks (see `switchPluginPath`) the store already
 * holds the change while the record still holds what the user last saw.
 */
import { fleetLoadout } from '../fleet/snapshot'
import type { PoiState } from '../fleet/types'

interface Shown {
  fleetIds: number[]
  setup: string
}

let shown: Shown | undefined

/** Record what the panel shows; undefined while the game data is not loaded. */
export function setShownFleet(value: Shown | undefined): void {
  shown = value
}

/** A different setup: ships or equipment. HP, repairs included, does not count. */
export function selectedFleetChanged(state: unknown): boolean {
  try {
    if (!shown) return false
    const now = fleetLoadout(state as PoiState | undefined, shown.fleetIds)
    if (!now) return false
    return now.setup !== shown.setup
  } catch {
    return false
  }
}
