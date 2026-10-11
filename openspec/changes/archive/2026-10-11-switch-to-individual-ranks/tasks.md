## 1. Setting

- [x] 1.1 In `src/ui/inputs.ts`, add `RANK_DISPLAY_KEY` (`plugin.poi_battle_sim.rankDisplay`), the `RankDisplay` type and `parseRankDisplay` (anything but `'cumulative'` → `'individual'`)
- [x] 1.2 Extend `PoiState.config` in `src/fleet/types.ts` with the `plugin.poi_battle_sim.rankDisplay` path
- [x] 1.3 Add a rank-display `RadioGroup` with a hint to `src/ui/Settings.tsx`, writing the key on change; update its header comment
- [x] 1.4 Test `parseRankDisplay`: missing, `'individual'`, `'cumulative'`, `'both'`, `true`

## 2. Rates

- [x] 2.1 In `src/ui/views.ts`, add `rankPair(r, mode)`; rename `RateCells` fields `aPlus`/`bPlus`/`aPlusAtBoss`/`bPlusAtBoss` to `a`/`b`/`aAtBoss`/`bAtBoss`; make `rowCells` and `summaryCells` take the mode
- [x] 2.2 Leave `weightedRanks` / `sortForCards` on the cumulative values; note in a comment that the order matches S, A, B

## 3. Display

- [x] 3.1 `src/ui/Panel.tsx`: read the setting with `useSelector` + `parseRankDisplay` and pass it to `Summary` and `RouteCards`
- [x] 3.2 `src/ui/Summary.tsx`: labels `A` / `B` or `A or better` / `B or better` by mode, new field names in `ZERO`; header comment updated
- [x] 3.3 `src/ui/RouteCards.tsx`: labels `A` / `B` or `A+` / `B+` by mode, new field names
- [x] 3.4 `i18n/en-US.json`, `ja-JP.json`, `zh-TW.json`: add `A` / `B` and the setting's label, option and hint texts

## 4. Tests and verification

- [x] 4.1 `test/views.test.ts`: cover both modes per route (individual `40.0/20.0/10.0%`, when reached `50.0/25.0/12.5%`; cumulative `40.0/60.0/70.0%`, `50.0/75.0/87.5%`) and for the summary; check the sort order is the same in both
- [x] 4.2 Run `npm test` and the type check
- [x] 4.3 In poi: with results on screen, switch the setting on the settings page and confirm the summary and cards relabel and change values immediately, with no new run
