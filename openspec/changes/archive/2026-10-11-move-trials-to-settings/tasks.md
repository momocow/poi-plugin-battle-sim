## 1. Config

- [x] 1.1 In `src/ui/inputs.ts`, export `TRIALS_KEY` (`plugin.poi_battle_sim.trials`); remove `trials` from `SavedInputs`, `loadInputs` and `saveInputs`
- [x] 1.2 Extend `PoiState.config` in `src/fleet/types.ts` with the `plugin.poi_battle_sim.trials` path
- [x] 1.3 Update `test/inputs.test.ts` for the new `SavedInputs` shape; check `saveInputs` no longer writes `trials`

## 2. Panel

- [x] 2.1 `src/ui/Panel.tsx`: read the count with `useSelector` + `clampTrials` and use it in `current`; drop `trials` / `onTrials` from the `Controls` props
- [x] 2.2 `src/ui/Controls.tsx`: remove the trials row, its state and imports; update the header comment

## 3. Settings page

- [x] 3.1 Add `TrialsSetting` to `src/ui/Settings.tsx`: preset select + custom field, writing `TRIALS_KEY` only for a whole number 1–100000; update the header comment
- [x] 3.2 Add any missing i18n text in `i18n/*.json` (e.g. a hint naming the range and default)

## 4. Verification

- [x] 4.1 Run `npm test` and the type check
- [x] 4.2 In poi: the controls bar has no trials row; an existing count shows on the settings page; changing it there dims the result and, with Auto on, starts a run with the new count after the delay
