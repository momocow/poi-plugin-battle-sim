## 1. State

- [x] 1.1 In `src/ui/Panel.tsx`, derive `autoPaused` from `inputs.auto`, `loadout` and `shipCount` (see design), and pass it to `Controls`
- [x] 1.2 Add `autoPaused: boolean` to `ControlsProps` in `src/ui/Controls.tsx`

## 2. Controls

- [x] 2.1 Give the Auto `Switch` the `battle-sim-auto-paused` class while `autoPaused`
- [x] 2.2 Add the paused line to the Auto tooltip while `autoPaused`, after the existing lines
- [x] 2.3 Make the Simulate button primary while `autoPaused` and not running; update its comment

## 3. Styles and text

- [x] 3.1 In `src/ui/styles.ts`, colour the checked indicator of `.battle-sim-run .battle-sim-auto-paused` with the warning palette, including hover, active and disabled, in light and dark themes
- [x] 3.2 Add the paused tooltip string to `i18n/en-US.json`, `i18n/zh-TW.json` and `i18n/ja-JP.json`

## 4. Verify

- [x] 4.1 Add or extend a test for the `autoPaused` derivation: Auto off, no fleet, empty fleet, empty main slot, and empty expansion slot only
- [x] 4.2 Run the type check and test suite
- [x] 4.3 In poi, unequip and re-equip a slot with Auto on: check the switch colour, the tooltip, the Simulate emphasis, and that the run starts on refill; check the dark theme too
