## 1. Project setup

- [x] 1.1 Create the npm package: `package.json` with the `poiPlugin` metadata, TypeScript built to CommonJS, Vitest, `.gitignore` (excluding binaries, `data/`, and `dist/`), and `git init`
- [ ] 1.2 Add a plugin entry point that exports the panel component and registers it with poi. Confirm it loads in a local poi install
- [x] 1.3 Add i18n setup with zh-TW, ja, and en string tables, following poi's language setting

## 2. Optimizer interface (depends on optimizer steps a and c)

- [x] 2.1 Record fixture output: `simulate --json` success, runtime `error`, exit code 2 with only stderr, and an unknown `schema` value. Use real optimizer output once it ships, and hand-written files until then
- [x] 2.2 `optimizer/resolve.ts`: read the pinned `optimizer.json`, choose the asset for the current platform and architecture, check its SHA-256 once per session, and support the development override from poi config (`plugin.poi_battle_sim.optimizerBin` / `.optimizerData`) with the `BATTLE_SIM_OPTIMIZER_BIN` / `BATTLE_SIM_OPTIMIZER_DATA` environment variables as fallback, plus a poi settings page for the two paths
- [x] 2.3 `optimizer/run.ts`: start the process with the absolute paths from D7, write the TOML to stdin and close it, split stdout into lines and parse each as JSON, collect stderr, apply the terminal-line and exit-code rules, check `schema`, and support kill-on-cancel
- [x] 2.4 Unit tests for `run.ts` using the fixtures and a fake child process: success, error line, exit code 2, missing terminal line, stderr warnings alongside success, and an unknown schema

## 3. Fleet capture

- [x] 3.1 Capture a fixture of poi's store state with a real logged-in session: fleets, ships, equipment, and master data, including an empty middle slot, an expansion slot, and a combined fleet
- [x] 3.2 `fleet/snapshot.ts`: read the selected fleet into a snapshot. Reject an empty fleet, missing game data, and combined fleets
- [x] 3.3 `fleet/toToml.ts`: convert the snapshot to `[[fleet.ships]]` entries (ship ID, level, modernization, equipment with improvement level and proficiency, expansion slot, current HP, morale), with empty slots dropped
- [x] 3.4 `fleet/toDeckbuilder.ts`: convert the snapshot to a deck-builder v4 document
- [x] 3.5 Tests: both outputs describe the same ships and equipment, and the empty-slot and expansion-slot cases come out correctly

## 4. Route prediction

- [x] 4.1 `routes/compass.ts`: create a hidden webview in the `battle-sim-compass` partition, load `?pdz=`, run the injected script (shape check, `UPDATE_SELECTED_AREA`, poll `simResult` with a 20 s timeout), return the candidates or a typed error (`COMPASS_UNREACHABLE` / `COMPASS_SHAPE` / `COMPASS_UNSUPPORTED_MAP` / `COMPASS_TIMEOUT`), and remove the webview afterwards. No automatic retry
- [ ] 4.2 Test the compass flow by hand inside poi on 5-2, 2-5, and 4-2, and compare with the results confirmed in Chrome. Also check 7-5 with F→J (every route passes F-J), and 7-3 at phase 2. Check that the game view's storage is untouched
- [x] 4.3 `routes/boss.ts`: read `boss_letters` from the bundled `data/maps.json` and mark each candidate as reaching the boss or not
- [x] 4.4 `routes/predict.ts`: compass only, with a cache for the poi session keyed by map, ship composition, and equipment that affects routing. Failures are not cached
- [x] 4.5 Tests: injected-script result parsing (decimal rates, sum = 1), mapping each error type, boss marking (2-5 `1-C-D` does not reach the boss), cache hit/miss, and that no requests go to any host other than compass
- [x] 4.6 `routes/choices.ts`: a table of choosable nodes (targets and compass default) and phase values for normal maps (4-5, 5-3, 5-5, 5-6, 6-3, 7-3, 7-4, 7-5), taken from compass. In the injected script, check the table's keys against `options[map]` and apply choices with `UPDATE_OPTION_WITH_KEY`. Add the choices to the cache key. Tests: key mismatch → `COMPASS_SHAPE`, and a different choice gives a different cache key

## 5. Simulation and aggregation

- [x] 5.1 `optimizer/aggregate.ts`: keep each route's conditional `ranks` as its rate at the boss; derive the overall rate at the boss as the weighted marginal rate divided by the weighted reach-boss rate, undefined when that is 0; and weight `ranks_marginal`, `reach_boss_rate`, and `boss_sunk_rate` by route probability, with routes that miss the boss counted as 0. Weight `player_sunk_any_rate` only over the simulated routes, renormalized
- [x] 5.2 Aggregation tests, including the spec scenarios: the 0.68 two-route case, the 0.72 retreat case, the 0.5 and ≈0.667 rates at the boss, and the undefined case when the boss is never reached
- [x] 5.3 Orchestrator: run one process per route that reaches the boss, at most 2 at a time, report progress as finished/total, and on cancel kill every process and discard partial results

## 6. Panel

- [x] 6.1 Panel state machine: idle → predicting → simulating → done/error (no confirmation step between predicting and simulating), with Simulate disabled while a run is in progress
- [x] 6.2 Inputs: fleet 1–4, a list of normal maps taken from poi's map master data, and a trial count defaulting to 2000. Save the last choices between poi sessions
- [x] 6.3 `fleet-view/model.ts`: build one view model from either live store state or a snapshot, using poi's `getTyku`, `getSaku33` (×1/×3/×4), and `getFleetSpeed`/`getSpeedLabel`, with i18n names. Unit tests check that the live and snapshot paths give the same result for the same fleet
- [x] 6.4 `FleetView` / `ShipRow` / `SlotItem`: summary row (speed, fighter power, LoS ×1 with a hover popover for ×3/×4), then each ship's name, level, and type, then each equipment item's `SlotitemIcon`, name, `★N`, and proficiency image, with the expansion slot shown separately. Layout follows hensei-nikki; no code is copied
- [ ] 6.5 Fleet source switching: live view before a run, the frozen snapshot with its capture time from the start of a run through the results. Check by hand that a change in game during a run doesn't change the display
- [x] 6.6 Route table: route text formatting (drop the start node, join with `-`, append `[Boss]` to a boss last node), rows sorted by probability, per-route columns (reach boss, S, A, ≤B, boss sunk, ship lost) counting all trials, with S/A/≤B rates at the boss shown next to them, pending cells that fill in as each route finishes, and "not simulated" for routes that don't reach the boss. Unit tests for the formatting, including multi-letter nodes such as `C2`
- [x] 6.7 Summary block above the table: overall rates from `aggregate.ts` (S/A/≤B shown both ways), shown only when all routes have finished, with ship loss labeled as covering simulated routes only, plus the snapshot time and trials per route. Percentages to one decimal place. A test checks that the summary equals the probability-weighted sum of the table's columns
- [x] 6.8 Error view: a summary plus expandable details for each error type in the specs, and a Retry action for route prediction errors
- [x] 6.9 Branch and phase controls: one control per choice for the selected map, set to compass's default, remembered per map, locked during a run, and the choices listed in the summary
- [ ] 6.10 Single-column layout for poi's narrow plugin area: controls → status → collapsible fleet → summary → route table (route text on its own line, rate at boss stacked under the all-trials rate). Check at 400px wide that nothing scrolls sideways

## 7. Packaging and release

- [ ] 7.1 Optimizer repo (separate work): a CI matrix producing release builds for win-x64, mac-arm64, mac-x64, and linux-x64, each with its `data/` and SHA-256
- [ ] 7.2 Per-platform packages (D6): poi's installer was checked (npm 11.18, `--global-style --ignore-scripts`, honours `os`/`cpu` on optional dependencies). Done: `optimizer/resolve.ts` finds the binary through the platform package (`{package, path, sha256}`), the `prepublishOnly` fetch script (`scripts/fetch-optimizer.mjs`) pinned to v0.2.0, and the darwin-arm64 package. Remaining: add win32-x64, darwin-x64 and linux-x64 (`optimizer.json` entry, `platforms/<key>/package.json`, `optionalDependencies`) once 7.1 publishes their builds
- [ ] 7.3 Before release, send a courtesy message to the compass author (X-20A) about the webview integration
- [ ] 7.4 End-to-end check in poi on Windows and macOS: run 5-2 with a real fleet and get a result, then cancel a second run partway through
