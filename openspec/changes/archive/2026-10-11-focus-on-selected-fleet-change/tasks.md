## 1. Shared panel view of the selected fleet

- [x] 1.0 In `src/fleet/snapshot.ts`, add `setup` (ships and equipment without HP) to `Loadout`. Keep `key` as it is. In `test/fleet.test.ts`, test that `setup` ignores HP and morale and follows equipment
- [x] 1.1 Add a small module in `src/ui/` holding the selected fleet ids and their `setup` as last shown, with a setter and a pure `selectedFleetChanged(state)` that is true when `fleetLoadout(state, ids)?.setup` differs from the held one. It returns false when either is undefined or on any thrown error
- [x] 1.2 In `Panel.tsx`, write the held ids and `setup` in an effect on the selected fleet and its loadout key
- [x] 1.3 Unit-test `selectedFleetChanged`: unchanged, equipment changed on the selected fleet, changed only on another fleet, ship moved in, HP rose or fell on the selected fleet, nothing held yet, game data not loaded

## 2. Conditional switch paths

- [x] 2.1 In `index.ts`, make every `switchPluginPath` entry `{ path, valid }` using `selectedFleetChanged(getStoreState())`. Drop `can_preset_slot_select`. Add `/kcsapi/api_get_member/ship3` and `/kcsapi/api_req_kousyou/remodel_slot`. Rewrite the doc comment: selected fleet only, no focus on HP changes, why `ship3` is listed, and poi's response-then-event ordering

## 3. Verify

- [x] 3.1 Run the type check and the test suite
- [ ] 3.2 In poi, with another tab shown: swap a gun on the selected fleet → the tab comes forward. Swap on another fleet → it stays. Move a ship into the selected fleet → it comes forward. Enter the remodel screen → it stays. Remodel a ship in the selected fleet → it comes forward. Use an instant repair on a ship in the selected fleet → poi's main view, no flash of the plugin's tab, and a run starts in the background. Return damaged from a sortie → poi's main view as before. Improve equipment held by a ship in the selected fleet → it comes forward. Uncheck poi's "Enable auto switch" → nothing comes forward
