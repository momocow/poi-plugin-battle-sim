## 1. Node distances

- [ ] 1.1 Confirm `add-event-map-support` is applied: the game-data loader exposes the `nodeDistances` part in the run's captured snapshot and the version in use
- [ ] 1.2 `src/fleet/nodeDistances.ts`: `distanceOf(map, letter)` and `knownFor(map)` over the `nodeDistances` part; tests for a known node, an unlisted node, and an unlisted map

## 2. Land base capture

- [ ] 2.1 Types in `src/fleet/types.ts`: poi `airbase` state shape on `PoiState.info`, and `LandBaseSnapshot { number, name, action, range, squadrons: { equipId, improvement, proficiency, count, maxCount }[] }`
- [ ] 2.2 `snapshotLandBases(state, map)` in `src/fleet/snapshot.ts`: area = world number, base-number order, drop empty/relocating squadrons keeping order, range = base + bonus; add `landBases` to the run's snapshot
- [ ] 2.3 Add a land-base part (action, plane IDs, stars, counts, range; not proficiency) to the loadout key for the shown map's area, so base changes trigger Automatic runs
- [ ] 2.4 Tests in `test/fleet.test.ts` / `test/focus.test.ts`: two bases on 6-4, relocating squadron, area without bases, proficiency-only change does not change the key; extend `test/fixtures/store.json` with an `airbase` sample

## 3. Assignment and TOML

- [ ] 3.1 `src/ui/inputs.ts`: `landBases` config key `{ [map]: { [base]: [wave1|null, wave2|null] } }`, read/validate/write like `formations`
- [ ] 3.2 `src/fleet/landBaseWaves.ts`: from snapshot bases + assignment + simulated battle letters → bases to send (Attack, ≥1 squadron, ≥1 wave on route, renumbered in base order) and `lbas_waves` per letter in arrival order
- [ ] 3.3 `simulateToml`: write `[[lbas.bases]]` (`action = "Attack"`, `base_radius`, `slots`), add `lbas_waves` to each node's `[tactics.nodes.<letter>]` (creating the table when needed), and `[route.node_flags.<letter>] node_distance` for known distances only when a base is sent
- [ ] 3.4 Thread the assignment and the run's captured game-data snapshot (for node distances) through `runner.ts` / `orchestrate.ts` to each route's TOML
- [ ] 3.5 Tests in `test/config.test.ts`: two waves at boss, waves split across nodes in order, target off route dropped, non-Attack base sends nothing, no-LBAS TOML byte-identical to before, distance written / omitted when unknown, out-of-range wave still written

## 4. Mid-sortie record

- [ ] 4.1 `src/fleet/landBaseSortie.ts`: listen to `game.response`; `start_air_base` postBody `api_strike_point_<n>` → pending strike points; `map/start` adopts them (or none), reads `api_cell_data[].api_distance`, marks observed; `port/port` clears; devLog each event with the raw fields
- [ ] 4.2 Start/stop it with the specials recorder in `index.ts`
- [ ] 4.3 In the runner: when the run is mid-sortie and the record is observed, build the assignment from the record (cells → letters via topology) and override distances with the game's; otherwise use the panel's assignment for the sortie's map and the game-data package's distances
- [ ] 4.4 Verify the `start_air_base` postBody shape and `api_cell_data[].api_distance` on a live 6-4 sortie with the developer log; adjust the parser and add the captured bodies as test fixtures
- [ ] 4.5 Tests in `test/sortie.test.ts` / a new `test/landBaseSortie.test.ts`: assignment from the game, passed target dropped, no base sent ⇒ no waves, game distance wins, not observed ⇒ panel + game-data package

## 5. Land bases popup

- [ ] 5.1 `src/ui/LandBases.tsx` after `NodeSettings.tsx`: base rows (number, name, plane icons, range, action), Wave 1/Wave 2 selects for Attack bases with None + battle nodes (boss marked), non-Attack note, out-of-range greyed / remembered-out-of-range marked, "range can't be checked" note, Clear all, commit-on-close with immediate run when changed
- [ ] 5.2 Button in `Controls.tsx` next to Node settings: shown with Node settings and when the shown map's area has a base; disabled while running; sortie mode shows the observed in-game assignment read-only with a note
- [ ] 5.3 i18n strings for zh-TW / ja-JP / en-US (陸航, wave labels, actions, notes)
- [ ] 5.4 Tests in `test/views.test.ts` / `test/inputs.test.ts`: popup on 6-4, hidden on 2-5, out-of-range disabled, unknown distances note, remembered per map, run on close / no run when unchanged

## 6. Wrap-up

- [ ] 6.1 `npm run typecheck` and `npm test` pass
- [ ] 6.2 Manual check in poi on 6-4 with two Attack bases: popup, a run before sortie, and a mid-sortie run using the in-game assignment
- [ ] 6.3 README: mention land-base support and that node distances come from the game-data package
