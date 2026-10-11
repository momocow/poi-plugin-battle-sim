## Why

poi brings the plugin's tab forward on entering the remodel screen and on any ship or equipment change in any fleet. Most of those changes don't affect the selected fleet, so they start no run, and the tab comes forward with nothing new to show. That takes the user away from the tab they were on for nothing. Bringing it forward should mean the panel has something new to show. Since `auto-run-on-hp-change`, HP changes also start runs, but they don't bring the tab forward: on the docking screen and on returning to port, poi switches to its own main view, and the plugin leaves that alone.

## What Changes

- poi brings the plugin's tab forward only when a change in game leaves the selected fleet's ships or equipment different from what the panel last showed. The changes that count are the same as before: a ship placed, removed, moved or swapped, a preset loaded, a remodel or modernization, equipment equipped, removed, moved or improved, or an expansion slot opened.
- HP changes, repairs included, don't bring the tab forward. Their run still starts in the background.
- **BREAKING**: entering the remodel screen no longer brings the tab forward by itself.
- **BREAKING**: changes to fleets other than the selected one no longer bring the tab forward. Moving a ship into or out of the selected fleet still does.
- It still goes through poi's plugin auto switch, so poi's "Enable auto switch" checkbox for this plugin and poi's global setting still apply. Whether the change also starts a run is unchanged: that depends on the Auto switch and on every main slot being filled. Focus does not.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Auto focus requirement narrows from "any ship or equipment change, and entering the remodel screen" to "a change to the selected fleet's ships or equipment", and states that HP changes don't switch the tab.

## Impact

- `index.ts`: `switchPluginPath` entries become `{ path, valid }` objects, a form poi's auto switch supports, with `can_preset_slot_select` removed and the equipment follow-up `api_get_member/ship3` and `api_req_kousyou/remodel_slot` added.
- `src/fleet/snapshot.ts`: `fleetLoadout` also returns `setup`, its ships and equipment without HP. `key`, which automatic runs compare, is unchanged.
- `src/ui/`: a small shared record of the selected fleet's `setup` as the panel last showed it, written by `Panel.tsx` and read by `valid`.
- Tests for the `valid` check.
- No change to automatic runs, the optimizer, route prediction or i18n.
