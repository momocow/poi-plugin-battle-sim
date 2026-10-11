## 1. Config

- [x] 1.1 In `src/ui/inputs.ts`, add `AUTO_RUN_DELAY_KEY` (`plugin.poi_battle_sim.autoRunDelay`), `DEFAULT_AUTO_RUN_DELAY_MS = 1000`, `MAX_AUTO_RUN_DELAY_MS = 60000`, and `loadAutoRunDelay()`, which returns the configured integer within 0–60000 and the default otherwise
- [x] 1.2 Add tests to `test/inputs.test.ts`: the default when unset; a valid value (0, 3000, 60000) is returned; invalid values (-5, 1.5, 60001, "fast", null) fall back to 1000

## 2. Panel

- [x] 2.1 In `src/ui/Panel.tsx`, remove `AUTO_RUN_DELAY_MS` and pass `loadAutoRunDelay()` to the auto-run `setTimeout`, read when the timer is set; update the comment above it

## 3. Settings page

- [x] 3.1 In `src/ui/Settings.tsx`, add a number field for the auto-run delay (min 0, max 60000, step 100) that writes only valid integers, with a hint giving the 1000 ms default; update the file's header comment
- [x] 3.2 Add the new strings to `i18n/en-US.json`, `i18n/ja-JP.json`, and `i18n/zh-TW.json`

## 4. Verify

- [x] 4.1 Run the type check and the vitest suite
- [ ] 4.2 In poi, check that automatic runs wait about 1000 ms by default and that a delay changed on the settings page applies from the next change
