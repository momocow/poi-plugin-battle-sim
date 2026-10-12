## 1. Node kinds, default rule and ship-count limit

- [x] 1.1 In `src/routes/topology.ts`, add `nodeColors(route)` (the existing majority vote) and rewrite `nightOnlyNodes` as a filter over it. The existing topology tests still pass
- [x] 1.2 Add `src/routes/formation.ts` with:
  - the `Formation` union (`LineAhead` / `DoubleLine` / `Diamond` / `Echelon` / `LineAbreast` / `Vanguard`) and an `isFormation` guard;
  - `defaultFormation({ color, enemies, isSubmarine })` → `{ formation, reason }`, applying the rules in order: submarines only → submarines mixed → night → air (colour 7 or 10) → normal
- [x] 1.3 Add `allowedFormation(formation, shipCount)`, mirroring the optimizer's single-fleet downgrade: fewer than 4 ships → `LineAhead`, and `Diamond` with fewer than 5 ships → `DoubleLine`
- [x] 1.4 Add `nodeEnemies(kcnavDir, map, letter)`: a synchronous read of the candidates in `<letter>.json` (enemy ids and escort ids). It returns `undefined` when the file is missing or unreadable, and caches by path and mtime
- [x] 1.5 Add `submarineCheck($ships)` (`api_stype` 13 or 14) and a `nodeFormations({ battles, colors, enemiesOf, isSubmarine, user })` helper. For each battle node it returns `{ formation, isDefault, defaultFormation, reason }`
- [x] 1.6 Unit tests:
  - each rule and the priority between them (all-submarine night node → 単横陣, air raid → 輪形陣, air battle → 輪形陣, all submarines with an empty escort → 単横陣, enemy combined fleet with submarines → not "only", one composition with a submarine → 梯形陣, missing enemy data → 単縦陣);
  - `allowedFormation` at 3, 4 and 5 ships;
  - user formations taking precedence over defaults, and nodes without a battle left out.

  Use the 5-2 and 1-5 kcnav fixtures where possible.

## 2. Simulation config and runner

- [x] 2.1 `simulateToml` takes `formations: Record<string, Formation>` and emits one `[tactics.nodes.<letter>]` table per entry with `formation`. The target's table also carries `do_night_battle`. Update `test/config.test.ts`
- [x] 2.2 Add `formations: Record<string, Formation>` (the map formations of the run's map) to `RunInput`. Include it in `isStale` and its doc comment
- [x] 2.3 In `runSimulation`, after the enemy-data wait, resolve each route's simulated slice to formations: the user's formation, else the default from topology, node enemies and `$ships`. Pass the result to `simulateToml`, sending the chosen formation rather than the downgraded one. Log the resolved formations, with their source, in `route.config`
- [x] 2.4 Check against the pinned optimizer that a `formation` table on an air-raid node and on a night-battle node is accepted (with a recorded fixture or a manual `simulate --json` run). Note the result in this task
  - The runner edit first failed to apply, unnoticed because `formations` was optional; it is now required in `simulateToml`. Rechecked with the logged 7-5 config: B retreat 19% with no formations, 12% with the defaults, 7.6% with B = `Vanguard`
  - Result (optimizer v0.3.0, manual run): 5-2 `1-B-C` with C = `Diamond` (air raid) and 5-3 `…-I-O-P` with I and P = `Echelon` (night) both exit 0 with a result line. Swapping C to `LineAhead` under the same seed changes C's ranks (S 0.48 → 0.44), so the formation is applied. A target at an air raid gets a WARN that `do_night_battle` has no effect there, which predates this change

## 3. Persistence

- [x] 3.1 In `src/ui/inputs.ts`, add `formations: Record<string, Record<string, Formation>>` to `SavedInputs`. Load it from `plugin.poi_battle_sim.formations`, dropping invalid maps, letters and values, and save it with the rest. Add tests in `test/inputs.test.ts`
- [x] 3.2 In `Panel`, add `applyFormations(formations)` for the shown map: it saves the popup's edited formations (Default is an absent entry), dropping a map with no entries left. Reset leaves formations alone
- [x] 3.3 Build `current.formations` from the shown map's entries, so that stale dimming follows saved formations

## 4. Formations editor

- [x] 4.1 Add a Formations button to the Target / Night battle row in `Controls.tsx`. It is shown only when that row is shown, and it opens a Blueprint `Popover`
- [x] 4.2 Add a new `FormationEditor` component with:
  - one row per battle node, sorted naturally by letter, with boss letters marked;
  - each row showing the letter, the default reason and an `HTMLSelect` (Default (X) first, then the six formations), with user-set rows marked;
  - a scrollable body with a max height
- [x] 4.3 Grey out the options that `allowedFormation` changes for the selected fleet's live ship count. On a row whose formation is not allowed, show "X → Y (N ships)"
- [x] 4.4 Keep the edits in a draft taken when the popup opens. When the popup closes, if the draft differs from that copy:
  - save it;
  - record the new auto-run key in `lastAutoKey`, so no delayed auto-run follows;
  - start a run at once through the same path as Simulate, whatever the Auto switch says. Skip this when Simulate is disabled.

  If the draft doesn't differ, do nothing.
- [x] 4.5 Disable the Formations button while a run is in progress. In sortie mode, the editor uses the sortie's map
- [x] 4.6 Add styles in `src/ui/styles.ts` for the editor table, the user-set marker and the downgrade note
- [x] 4.7 Add a Reset all to default button under the rows: it clears the draft, so it applies on close like any edit, and is disabled when the draft is empty

## 5. Text and docs

- [x] 5.1 Add zh-TW / ja-JP / en-US strings: the six formation names, the five reasons, Formations, Default ({formation}), Boss, and the downgrade note. Extend `test/i18n.test.ts` if it checks that keys are complete
- [x] 5.2 Add node formations and their defaults to the README's feature list

## 6. Verification

- [x] 6.1 `npm test` and the type check pass
- [x] 6.2 Check in poi, on 5-2:
  - the editor shows C/L 輪形陣 (air raid), I 輪形陣 (air battle), D 梯形陣 (submarines mixed), E 単縦陣;
  - the developer log's TOML has the matching `[tactics.nodes.*] formation`;
  - an override survives a poi restart;
  - a 4-ship fleet greys out 輪形陣 and C's row notes 複縦陣;
  - several edits followed by closing the popup start exactly one run, with no second one after the auto-run delay, and closing without a change starts none;
  - the Formations button is disabled while a run is in progress
