## 1. Night battle model

- [x] 1.1 Add `NightBattle = 'always' | 'never'`, an `isNightBattle` guard, and `nodeNightBattle({ setting, isTarget, color })` (air raid → `undefined`, night-battle node → `true`, always / never, else `isTarget`) next to the formation module
- [x] 1.2 Unit tests: each case of `nodeNightBattle`, including a night-battle node set to never, and an air raid as the target

## 2. Simulation config and runner

- [x] 2.1 `simulateToml` takes `nightBattles: Record<string, boolean>` instead of `nightBattle` and writes `do_night_battle` into each node's table with `formation`; a node with neither gets no table. Update `test/config.test.ts`
- [x] 2.2 Replace `RunInput.nightBattle` with `nightBattles: Record<string, NightBattle>`; update `isStale` and its tests
- [x] 2.3 In `runSimulation`, build each route's `nightBattles` from the topology colours, the run's settings and its target. Without a topology, send only the target as `true`. Log the effective values in `route.config`
- [x] 2.4 Keep the target's effective night battle on the run state for the footer, and update `ResultFooter` so "No night battle" reads it

## 3. Persistence and panel state

- [x] 3.1 In `inputs.ts`, add `nightBattles` per map under `plugin.poi_battle_sim.nightBattles` with validation, remove `nightBattle` from `SavedInputs` and stop reading or writing that key. Update `test/inputs.test.ts`
- [x] 3.2 In `Panel`, shrink the target pair to `{ target }`, drop the night-only forcing, add the shown map's `nightBattles` to `current`, and turn `applyFormations` into `applyNodeSettings`, saving both stores
- [x] 3.3 In `Controls`, remove the Night battle switch and its props; the target row holds Target and the Node settings button

## 4. Node settings editor

- [x] 4.1 Rename `FormationEditor.tsx` to `NodeSettings.tsx` (`NodeSettingsButton`), with the button labelled 逐點設定
- [x] 4.2 Add the 夜戰 select per row: If target (default) / Always / Never, user-set choices marked. Night-battle nodes show Always and air raids show Never, both disabled, with a tooltip saying why
- [x] 4.3 Make the draft cover both stores: the close check, `onClose`, and Reset all to default (clears both; disabled when both are empty)
- [x] 4.4 Styles for the extra column; keep rows readable at the popup's width

## 5. Text and docs

- [x] 5.1 i18n (zh-TW / ja-JP / en-US): 逐點設定 / Node settings, 夜戰, 如果為目標點 / 總是 / 絕不, and the two lock tooltips; remove the unused Night battle switch strings
- [x] 5.2 README: replace the Night battle switch with per-node night battle in the 陣形 section, renamed 逐點設定

## 6. Verification

- [x] 6.1 `npm test` and the type check pass
- [x] 6.2 Run the optimizer by hand on a 2-5 config with `do_night_battle` at a non-target node, and on a 5-2 config targeting an air raid with no `do_night_battle`; both exit 0, and the first changes that node's results
  - Result (optimizer v0.3.0, manual runs):
    - 2-5 `C-E-G-L-O` with `do_night_battle = true` at E: exit 0, and the optimizer's node table reads 夜戰 是 at E. The test fleet S-ranks E in daylight in every trial, so there is never a night phase to change the results.
    - The 7-5 fleet from the earlier check, with D on vs off (seed 11): reach after D 73.2% → 73.0%, boss S 34.5% → 33.6%, so the setting applies.
    - 5-2 `B-C` targeting the air raid C with no `do_night_battle`: exit 0, no WARN.
- [x] 6.3 Check in poi:
  - the target row shows Target and 逐點設定 only;
  - 5-3 P shows 總是, locked, and 5-2 C shows 絕不, locked;
  - setting 2-5 E to 總是 and closing starts one run whose log shows `do_night_battle = true` at E;
  - setting the boss to 絕不 makes the footer say "No night battle";
  - settings survive a poi restart
