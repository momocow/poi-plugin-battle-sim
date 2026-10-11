## 1. Nullable selection

- [x] 1.1 In `src/ui/inputs.ts`, make `SavedInputs.fleetId` `number | null` and `map` `string | null`. `saveInputs` writes `0` / `''` for null, and `loadInputs` reads them back as null. A missing or invalid value still falls back to `1` / `'1-1'`
- [x] 1.2 In `test/inputs.test.ts`, cover a cleared selection round-tripping through save/load, and a missing key still loading as fleet 1 and 1-1
- [x] 1.3 In `src/fleet-view/model.ts`, let `losMultiplier` and `buildFleetViewModel` take `map: string | undefined`, with ×1 for undefined. Add the case to `test/model.test.ts`

## 2. Panel

- [x] 2.1 In `Panel.tsx`, compute `current: RunInput | undefined`: the sortie's input when a fleet is selected and on a sortie (map may be null), else the selection's when both fleet and map are set, else undefined. Simulate, `isStale`, and the result dimming use it
- [x] 2.2 Make `autoKey` `'unselected'` while `current` is undefined, and require `current` in both the change effect and the focus effect before `scheduleAuto`
- [x] 2.3 Add `reset`: abort the run, clear `autoTimer`, `dispatch({ type: 'cancelled' })`, and `update({ fleetId: null, map: null })`
- [x] 2.4 Fleet section: with no fleet, show the "Fleet" header and a muted "Pick a fleet" hint. With a fleet and no map, show the live fleet with `map` undefined
- [x] 2.5 Update the `Panel.tsx` header comment to describe Reset and the unselected state

## 3. Controls

- [x] 3.1 In `Controls.tsx`, accept nullable `fleetId` / `map`. Render a disabled `—` option in each select only while it is unselected, and skip the branch/phase row when `map` is null
- [x] 3.2 Add `onReset` and a Reset button next to Simulate: disabled when both are unselected or in sortie mode, usable while running. Disable Simulate while there is no run target
- [x] 3.3 Add "Reset", "Fleet", and "Pick a fleet" (whichever are missing) to `i18n/en-US.json`, `ja-JP.json`, and `zh-TW.json`

## 4. Verify

- [x] 4.1 Run the type check and the test suite
- [x] 4.2 In poi: Reset during prediction and during simulation → run stops, no error shown. Reset on a finished result → result and footer cleared. Reset right after an equipment swap → no run. With the selection cleared: an equipment swap, a tab switch back to the plugin → no run. Pick fleet then map (also the same pair as before) → one run after the delay. The trial count on the settings page, Auto, and 7-5 choices unchanged by Reset. Restart poi → selects still empty. In sortie mode → Reset disabled. Fleet selected, no map, fleet sorties → runs in sortie mode; back in port → map select empty, no run
