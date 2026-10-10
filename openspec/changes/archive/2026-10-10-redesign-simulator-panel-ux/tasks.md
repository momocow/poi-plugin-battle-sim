## 0. Prerequisites

- [x] 0.1 Check that `add-shared-kcnav-prefetch` is applied and archived; rebase this work onto it
- [x] 0.2 Confirm against the optimizer that it retreats on 大破 (no sinking possible), so removing "ship lost" is safe; if not, stop and revisit the proposal
- [x] 0.3 Check that optimizer 0.2.1 is released (pass-through nodes and `_meta.route`); bump the `optimizer.json` pin and hashes, and record new 0.2.1 fixtures (including 2-3 `B-E-F-J-N`) under `test/fixtures/optimizer/`
- [x] 0.4 In a running poi, check whether the plugin container has a bounded height; record whether the layout uses the flex scroller or the sticky fallback — bounded, per poi source (c2ff08ee): docked plugins sit in a `height:100%` flex-column `.bp6-card`, pop-out windows in a `height:100%` tabpane; uses the flex scroller

## 1. Optimizer result and aggregate

- [x] 1.1 `run.ts`: add `per_node_reach` and `route` (from `_meta.route`: node + battle index) to `SimulateDiag`; require both in `readDiag`, including battle indexes in range (otherwise `OPTIMIZER_SCHEMA`); stop reading `player_sunk_any_rate`; update `test/run.test.ts` with the 0.2.1 fixtures and missing/out-of-range cases
- [x] 1.2 `runner.ts`: after each route result, check that the result's route nodes equal the route's nodes after the start; on mismatch, throw `OPTIMIZER_SCHEMA`; test it
- [x] 1.3 `aggregate.ts`: remove `shipLostSimulated`; replace `bOrWorse` with `aOrBetter` / `bOrBetter`; update `test/aggregate.test.ts`, including the cumulative-ranks scenario

## 2. View values

- [x] 2.1 `views.ts`: reshape `RateCells` to reach / S / A+ / B+ / boss sunk plus the three "when reached" values, in both `rowCells` and `summaryCells`
- [x] 2.2 `views.ts`: add `routeReach(diag)` (backward walk; a node without a battle takes the next battle's value) and `retreats(...)`, dropping retreats that round below 0.1%; test the 5-2 scenario (B 10.7%, C 3.3%, E 14.7%, F 12.3%) and the 2-3 empty-node scenario (B none, E/F/J 10.0%)
- [x] 2.3 `views.ts`: add `marginOfError(trials)` (±98/√trials) and `isStale(runInput, current)`; test 2000 → ±2.2%, and test staleness on map, fleet, trials, and choice changes
- [x] 2.4 Update `test/views.test.ts` for the new cell shapes

## 3. Fleet view model

- [x] 3.1 `model.ts`: add `hp`, `maxHp`, `morale`, `damage` to `ShipView` and `damagedCount` to `FleetViewModel`, with damage thresholds as integer comparisons
- [x] 3.2 `model.ts`: add `losMultiplier(map)` (×3 for 6-2/6-3, ×4 for 3-5/6-1, ×1 otherwise); `buildFleetViewModel` takes the map and exposes the applied multiplier
- [x] 3.3 Update `test/model.test.ts`: damage boundaries (75/50/25%), damaged count, LoS multiplier per map

## 4. Inputs

- [x] 4.1 `inputs.ts`: add `TRIAL_PRESETS = [500, 2000, 10000]` and a helper telling whether a count is a preset; test it in `test/inputs.test.ts`
- [x] 4.2 `Controls.tsx`: label fleet options "N: name" from the live fleet names, with the number only when names are missing
- [x] 4.3 `Controls.tsx`: trials as a preset select plus Custom, which reveals the number field; the local `custom` flag starts from whether the value is a preset
- [x] 4.4 `Controls.tsx`: merge Simulate and Cancel into one button that toggles on `running`

## 5. Status area

- [x] 5.1 Add `StatusArea`, rendered at the right of the controls bar: predicting spinner, `n / total` with `ProgressBar`, short fetch note with full-text tooltip, development-optimizer icon with tooltip
- [x] 5.2 Show "Done", then hide it about 3 seconds later through a `useEffect` timer that is cleared on a new run or unmount
- [x] 5.3 Remove the old status `div` from `Panel.tsx`

## 6. Results

- [x] 6.1 Add `ResultHeader`: map, fleet, snapshot time, trials, ±margin, choices; plus the stale note
- [x] 6.2 Rewrite `Summary.tsx`: large S / A or better / B or better, each with "(x% when reached)", then reach boss and boss sunk; no ship lost
- [x] 6.3 Add `RouteCards.tsx`: probability, a node stepper with retreat rates under the nodes (staggered when neighbors), and S / A+ / B+ / boss sunk when the boss is reached; pending and not-simulated states; delete `RouteTable.tsx`
- [x] 6.4 Wrap the header, summary, and cards in `.battle-sim-stale` when `isStale`

## 7. Fleet display

- [x] 7.1 `FleetView.tsx`: ship rows after poi's fleet tab: HP `now / max` over a poi-colored bar, morale with poi's colored square (`moraleBand`), equipment as icons with name/★/proficiency on hover
- [x] 7.2 `FleetView.tsx`: summary row shows LoS at the map's multiplier with its "×N" label, ×1/×3/×4 on hover, and a damaged-ships warning when `damagedCount > 0`
- [x] 7.3 `Panel.tsx`: pass the map into the fleet model: `inputs.map` live, `run.input.map` for a snapshot

## 8. Layout and styles

- [x] 8.1 `Panel.tsx`: fixed sections for controls, fleet (still collapsible), and result header with summary; a `.battle-sim-body` below them holds the error and route cards and is the only scroller; no outer scrollbar
- [x] 8.2 `styles.ts`: flex-column panel with an inner scroller, or the sticky fallback per 0.4; styles for the status area, route cards, probability bar, stale dimming; remove the unused table styles
- [x] 8.3 Check at 400px wide in poi, light and dark themes: no horizontal scroll, controls stay visible while scrolling, long routes wrap

## 9. Strings and verification

- [x] 9.1 Add new strings and remove unused ones in `i18n/en-US.json`, `ja-JP.json`, `zh-TW.json` (keys avoid ": " and a trailing "."); `test/i18n.test.ts` passes
- [x] 9.2 `npm run typecheck` and `npm test` pass
- [x] 9.3 Do a real run in poi (for example 5-2, 2-3 through B or D, and 7-5): check summary values against the cards, the retreat line, the stale dimming after changing the map, and that "Done" fades
