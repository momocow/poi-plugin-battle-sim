## 1. Check the optimizer

- [x] 1.0 Apply `send-current-supply` first, and pin the optimizer release that has `special_attacks_fired` in `optimizer.json`
- [x] 1.1 Run the optimizer's `simulate` with `map = "2-5"`, a tail route such as `route = ["E", "G", "L", "O"]`, `hp_now` on one ship, and `special_attacks_fired = [100]`. Confirm that it runs, that its route description and reach rates cover exactly those nodes, and that no special fires. If it bails, stop and raise it in the optimizer repo

## 2. Sortie from the store

- [x] 2.1 Add `sortieStatus`, `sortieMapId` and `spotHistory` to `PoiState.sortie` in `src/fleet/types.ts`
- [x] 2.2 Add a pure `sortieOf(state, fleetId)` returning `{ map: "W-N", cells }` while that fleet (fleet 1 for the combined fleet) is out, else undefined, and unit-test it: out, home, another fleet out, combined, missing slice
- [x] 2.3 Add a reader for `<kcnavDir>/<map>/_map.json` that turns cells into letters (`route[cell][1]`), failing with a "map data unreadable" `SimError` when it is missing, malformed, or lacks a cell. Unit-test it with a fixture `_map.json`

- [x] 2.4 Add a sortie record module that listens to `game.response`: it resets on `map/start` and `port`, sets an observed flag on `map/start`, and collects friendly (`api_at_eflag == 0`) `api_at_type` (day) and `api_sp_list` (night) ids from battle responses, keeping only 100–106, 400 and 401. Register and remove the listener with the plugin's lifecycle
- [x] 2.5 Unit-test it with captured day and night battle packets: one with a Nelson Touch, one with an enemy special that must be ignored, a reset on `map/start`, and a sortie not seen from its start
- [x] 2.6 In `fleetShipsToml`'s caller (`simulateToml`), write `special_attacks_fired` under `[fleet]` when the run has a non-empty list

- [x] 2.7 Report each sortie event (start, port, battle with raw shelling fields) and each mid-sortie run's path, kept routes and `special_attacks_fired` to the developer log (`add-dev-log`)

## 3. Narrowing and the start index

- [x] 3.1 Add a pure `narrowToPath(candidates, letters)` in `src/routes/` that keeps the candidates starting with `letters` and rescales them to sum to 1, failing with a "path not predicted" `SimError` naming the map and path when none match. Unit-test it with the 2-5 example, the boss case, and no match
- [x] 3.2 Add `from` to `RouteRow` (1 off-sortie) and replace the `nodes.slice(1)` used for simulation and for lining up reach rates with `nodes.slice(from)`. Keep `formatRoute` showing the whole route
- [x] 3.3 Add `sortie?: { cells }` to `RunInput`. In `runSimulation`, when it is set, await the kcnav fetch, read the letters, narrow the predicted candidates, and set `from` to the current node's index, before dispatching `predicted`

- [x] 3.4 Add `takenBranches(map, letters)` and a cached synchronous `cellLettersNow`. Predict mid-sortie runs with the branches taken. In the panel, lock the passed branch controls on the branch taken and put the taken branches in the effective input, without writing the remembered choices. Unit-test both helpers

## 4. Panel

- [x] 4.1 In `Panel.tsx`, build the effective `RunInput` from `sortieOf` (sortie map, its remembered choices, `sortie.cells`), and use it for Simulate, the auto-run key and `isStale`
- [x] 4.2 In `RouteCards.tsx`, render the nodes before `from` as passed (muted, no retreat label)
- [x] 4.3 In `ResultFooter.tsx`, show "<map> at <letter>" for a mid-sortie result, and, when the sortie wasn't seen from its start, a warning marker at the end of that line with the not-observed note as its tooltip
- [x] 4.4 Add the new strings (footer, not-observed note, the two errors) to `i18n/zh-TW.json`, `ja-JP.json` and `en-US.json`, and update the Panel header comment

- [x] 4.5 The mode tag at the right of the first control row, a grey Plan mode (規劃模式) in port and a red Sortie mode (出擊模式) during a sortie; in sortie mode the fleet and map selects disabled, and the map select showing the sortie's map with its branch controls, all without writing the remembered inputs

- [x] 4.6 Turning Auto back on while the result is dimmed starts a run at once (logged as `auto.resumed`), when the fleet qualifies

## 5. Verify

- [x] 5.1 Run the type check and the test suite
- [x] 5.2 In poi, sortie the selected fleet to a map other than the selected one: each node starts a run on the sortie's map with the passed nodes marked and the narrowed probabilities. The Sortie mode tag shows, and the fleet and map selects are disabled, showing the sortie's map. In port they're enabled again, showing the selected map. With Auto off, the result dims after advancing, and turning Auto on then starts a run at once. A no-battle node starts a run. Returning to port runs the selected map from its start. A branch choice set differently from the branch taken locks on the branch taken once passed, with no "path not predicted" error, and returns to the remembered choice at port. With the developer log on, after the first sortie with a special attack, `logs/dev.ndjson` shows the attack in a `sortie.battle` line's raw fields with its id recorded, and the `run.narrowed` lines after it pass that id in `specialAttacksFired`. Turning the plugin off and on in poi's plugin settings mid-sortie shows the not-observed note at the next node, and its runs send no `special_attacks_fired`
