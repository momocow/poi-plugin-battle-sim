## Context

poi's auto switch (`views/components/tab-area/use-auto-switch.ts` in poi) runs on each `game.response` event. For every plugin it accepts `switchPluginPath` entries that are either a path string, or `{ path, valid?: () => boolean }`, which matches only when `valid()` returns true. `valid` gets no arguments. poi dispatches the response to its Redux store synchronously and only then fires `game.response` (`views/env-parts/data-resolver.ts`), so `valid` sees the store after this response.

Not every current path updates the store itself. `hensei/change`, `hensei/preset_select`, `kaisou/powerup`, `kaisou/slot_exchange_index`, `kaisou/slot_deprive` and `kaisou/open_exslot` have store handlers. `kaisou/slotset`, `kaisou/slotset_ex`, `kaisou/unsetslot_all` and `kaisou/remodeling` do not: their effect reaches `info.ships` with the follow-up `api_get_member/ship3`. Equipment improvement (`kousyou/remodel_slot`) updates `info.equips` itself.

poi's own auto switch moves to its main view on `api_port/port` and `api_get_member/ndock` (and to its ship view on `preset_deck`). A plugin entry that matches wins over it for that response only.

`fleetLoadout(state, fleetIds).key` says whether the ships, their HP or equipment of some fleets changed, ignoring morale, level and proficiency. HP went into it with `auto-run-on-hp-change`, so a change in the key can no longer tell a repair from damage. `Panel.tsx` computes it for the selected fleet on each render.

## Goals / Non-Goals

**Goals:**
- Focus exactly when the selected fleet's ships or equipment differ from what the panel last showed.

**Non-Goals:**
- Switching tabs from the plugin itself.
- Any change to automatic runs.

## Decisions

**Compare the setup, not the key.** `fleetLoadout` gains `setup`, the ships and equipment without HP, next to `key`, which stays as it is for automatic runs. Focusing on any key change would land every damaged sortie return on the plugin's tab instead of poi's main view.

**No focus on repairs.** An earlier version also focused when a ship regained HP, listening on `nyukyo/start`, `nyukyo/speedchange`, `ndock` and `port`. An instant repair then flashed the plugin's tab: `nyukyo/start` brought it forward, and the `ndock` that always follows switched poi back to its main view, because by then the panel had recorded the repair and `valid` was false. Keeping the tab would need extra state to carry the repair across that follow-up `ndock`. Since the user is on the docking screen on purpose, repairs leave the tab to poi, and their run still starts in the background.

**Compare against what the panel last showed, not against the previous response.** A small module in `src/ui/` holds the selected fleet ids, plus `setup` from the panel's last render, written by `Panel.tsx` in an effect. `valid` computes `fleetLoadout(getStoreState(), ids)` and returns true when its `setup` differs from the held one. At `valid` time React has not re-rendered for this response yet (the event fires in the same task as the store dispatch), so the held values are the pre-change ones. The alternative was a baseline that `valid` itself keeps from its own last call. It goes stale whenever the fleet changes through a path not in the list, such as a sortie consuming damage control, or the user picking another fleet. Then the next unrelated response would focus. The panel's values have neither problem, because they are exactly what the user saw.

**One `valid` for every entry; listen on the follow-up too.** Every entry is `{ path, valid: selectedFleetChanged }`. The paths are the current list minus `can_preset_slot_select`, plus `api_get_member/ship3` and `api_req_kousyou/remodel_slot`. On `slotset` and similar, `valid` sees no change yet and returns false. The `ship3` that follows sees it and focuses. Keeping those request paths costs nothing and covers a poi version that starts handling them directly. `ship3` is also requested outside the remodel screen, but `valid` only lets it through on a real change to the selected fleet. `port`, `ndock` and `ship_deck` stay out, so poi's own main-view switch and a sortie in progress are never overridden.

**No panel, no focus.** Before the panel's first render, or while the game data is not loaded (loadout undefined), nothing is held and `valid` returns false.

## Risks / Trade-offs

- [React flushes the panel's render before `game.response` in a future poi or React version] → the held values already equal the new ones and `valid` returns false. The tab just stays put (fail-closed), and the automatic run still starts. A test pins the comparison, and poi's ordering is noted in the module's comment.
- [`valid` throws or the store shape changes] → it is wrapped to return false, so poi's auto switch for other plugins is never broken.
- [poi's `switchPluginPath` type says `string[]`] → only poi's TypeScript type is narrower. The runtime accepts objects, and this plugin exports its own value.
