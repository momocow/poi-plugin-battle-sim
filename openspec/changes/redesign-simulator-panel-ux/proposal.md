## Why

A UX review of the panel with a KanColle player found that the answer players come for (the boss S rate) sits below a ~600px fleet grid, and that Simulate scrolls away with the content. Rates use two denominators side by side ("56.7% / 96.0%") in a 7-column table that is unreadable at 400px. Ranks are grouped as S / A / ≤B, which lumps a B victory in with defeats, while quests and gauges are worded as S勝利 / A勝利以上 / 勝利 (B以上). The panel also leaves out the inputs and outputs that explain a bad result. Damaged HP and morale are sent to the optimizer but never shown, and the optimizer's `per_node_reach` (which node the fleet retreats at) is discarded. Meanwhile "ship lost" is close to 0% whenever the fleet retreats on 大破, so it is of little use.

## What Changes

- **Layout**:
  - The controls bar is pinned to the top of the panel.
  - Everything below it scrolls in its own area, in this order: errors, result header, summary, routes, fleet. Results now come before the fleet.
  - The fleet stays expanded and collapsible.
- **Status**:
  - Run status moves to a compact area at the right end of the controls bar: stage, `n / total` with a thin progress bar, and a short enemy-data-fetch note with the full text on hover.
  - "Done" fades out after a few seconds.
  - "Development optimizer" becomes a small warning marker with a tooltip.
  - Simulate and Cancel become one button that toggles.
  - Errors stay a prominent block with details and Retry.
- **Result header**:
  - A header line names the map, fleet, snapshot time, trials per route, and the run's margin of error.
  - It is dimmed with a "settings changed" note when the current inputs no longer match the run.
- **Summary**:
  - Large per-sortie (all-trials) rates for **S**, **A or better**, and **B or better (victory)**, each with a small "when boss reached" rate.
  - Then reach-boss and boss-sunk rates.
  - **BREAKING** (spec): S / A / ≤B as exclusive buckets and "ship lost" are removed.
- **Route cards** replace the 7-column table. Each route has:
  - its probability;
  - the route as a node stepper, with each node's retreat rate (from the optimizer's `per_node_reach`) under it;
  - S / A+ / B+ / boss sunk among trials that reached the boss.
  - **BREAKING** (spec): the "at boss" columns and "ship lost" column are removed from the table.
- **Fleet display**:
  - Each ship shows HP (`now/max` with a 小破/中破/大破 color) and morale, colored when low.
  - The summary row warns when any ship is damaged.
  - The LoS shown is the Formula 33 value for the selected map's multiplier; the other multipliers stay on hover.
- **Inputs**:
  - The fleet select shows each fleet's in-game name.
  - Trials become presets (Quick 500 / Normal 2000 / Precise 10000) plus Custom.
- **Optimizer result**:
  - The plugin reads and requires `per_node_reach` (one value per battle node) and `_meta.route`. `_meta.route` gives one entry per route node, with that node's kind and its battle index, if any.
  - This needs optimizer 0.2.1, which also stops resource and empty nodes from failing the run ("no enemy comp").
  - It no longer reports "ship lost" in the aggregate.

## Non-goals

- Damage state at the boss (the chance of 大破/中破 after the boss fight, as a repair-cost indicator). Players asked for it, but the optimizer's output has no per-ship damage channel yet. This needs optimizer work first and will be a follow-up change.
- Moving errors into the compact status area.

## Capabilities

### New Capabilities

### Modified Capabilities
- `simulator-panel`: the following requirements change.
  - Layout: pinned controls, a scrolling body, results before the fleet.
  - Progress: a compact status area and one Simulate/Cancel button.
  - Route table: replaced by route cards with retreat by node.
  - Summary: cumulative ranks, per-sortie values as the primary numbers, no ship lost.
  - Fleet display: HP, morale, LoS for the map's multiplier.
  - Inputs: fleet names, trial presets.
  - A stale-result indication is added.
- `battle-simulation`:
  - The weighted aggregate drops "lost at least one ship" and adds cumulative rank rates.
  - A new requirement adds per-node reach rates per route.
  - The optimizer result now requires `per_node_reach` and `_meta.route`, so the minimum optimizer version is 0.2.1.

## Impact

- `src/ui/Panel.tsx`, `src/ui/Controls.tsx`, `src/ui/Summary.tsx`, `src/ui/RouteTable.tsx` (replaced by route cards), `src/ui/styles.ts`, `src/ui/views.ts`: restructured.
- A new compact status component replaces the status `div` in `Panel.tsx`.
- `src/fleet-view/model.ts`, `src/fleet-view/FleetView.tsx`: HP, morale, map-specific LoS, damage warning.
- `src/optimizer/run.ts`: `SimulateDiag` gains `per_node_reach` and the route description, and `player_sunk_any_rate` is no longer read.
- `optimizer.json`: the pin moves to 0.2.1 once it is released.
- `src/optimizer/aggregate.ts`: no ship-lost aggregate; cumulative rank helpers.
- `src/ui/inputs.ts`: trial presets; the saved trial count is unchanged.
- `i18n/*.json`: new and removed strings in all three languages.
- Tests: `test/aggregate.test.ts`, view/cell tests, and the optimizer output parsing tests.
- Sequencing: this builds on the in-flight `add-shared-kcnav-prefetch` change, which also edits `Panel.tsx`, `state.ts` and the "Progress and cancel" requirement. Apply this change after that one is archived.
