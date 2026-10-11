## 1. Plugin visibility

- [x] 1.1 Add the `ui` slice (`activeMainTab`, `activePluginName`) and `config.poi.tabarea.double` to `PoiState` in `src/fleet/types.ts`
- [x] 1.2 Add a `PLUGIN_ID` constant (`poi-plugin-battle-sim`) and a pure `isPluginShown(state)` helper in `src/ui/inputs.ts`: `activeMainTab === PLUGIN_ID` in the single layout, `activePluginName === PLUGIN_ID` when double-tabbed
- [x] 1.3 Unit-test `isPluginShown` in `test/inputs.test.ts`: shown and not shown in each layout, and a state with no `ui` or `config` slice reads as not shown

## 2. Focus trigger in the panel

- [x] 2.1 In `Panel.tsx`, move the pending automatic run into a timer ref shared through `scheduleAuto`, cleared on unmount and by the input-change effect as before
- [x] 2.2 Add a focus effect on `isPluginShown`: on a not-shown → shown edge (a `lastShown` ref starting false, so mount in view counts), consume the focus and schedule the delayed run when Auto is on, the loadout is complete, and `run.phase === 'idle'`
- [x] 2.3 Update the Panel header comment to name coming into view with no run as an automatic-run trigger

## 3. Verify

- [x] 3.1 Run the type check and the test suite
- [ ] 3.2 In poi: with no run, select the plugin's tab → one run starts after the delay; switch away and back after it finishes → no new run; cancel, switch away and back → a run starts; with no run and another tab shown, swap a gun so auto switch brings the tab forward → exactly one run, with the new gun; with Auto off or an empty main slot, focusing starts nothing
- [ ] 3.3 In poi's double-tabbed layout, selecting the plugin in the plugin pane with no run starts a run
