## Context

The panel is one React tree under `src/ui/Panel.tsx`, with styles in a single CSS string (`src/ui/styles.ts`). Plain value computation lives in `src/ui/views.ts` (cells, `pct`, route text) and `src/optimizer/aggregate.ts` (weighting). The fleet display has its own view model in `src/fleet-view/model.ts`. The snapshot already captures `hp`, `maxHp` and `morale`, and sends `hp_now`/`morale` to the optimizer, but the view model drops them. The optimizer's `result` carries `per_node_reach`, but it is indexed by **battle** nodes only. From 0.2.1 it also carries `diag._meta.route`: one `{ node, kind, battle_index }` entry per route position, where `kind` is battle, airraid, maelstrom or pass, and `battle_index` is null for nodes without a battle. 0.2.1 also treats resource and empty nodes as pass-through. In 0.2.0 those nodes made routes such as 2-3 `B-E-F-J-N` fail with "no enemy comp". `readDiag` in `src/optimizer/run.ts` reads neither field today.

The in-flight `add-shared-kcnav-prefetch` change rewrites the fetching-status plumbing in `state.ts`/`runner.ts`/`Panel.tsx`. This change assumes that one is applied and archived first. It only moves where that status is rendered.

See proposal.md for motivation and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**
- Keep logic in its existing layers. Rates and retreats are computed in `aggregate.ts`/`views.ts`, which are already unit-tested. Components only lay them out.
- Change no run state machine semantics. `runReducer` stays as it is. Staleness and "Done" fading are derived in the UI.

**Non-Goals:**
- A theming system, or new dependencies beyond the Blueprint components poi already ships (`ProgressBar`, `Tooltip`, `Popover`, `Icon`).
- Changing what is sent to the optimizer.

## Decisions

### Layout: flex column with an inner scroll area
`.battle-sim` becomes `display:flex; flex-direction:column; height:100%`. The controls bar, the fleet display and the result header with the summary are `flex:none` sections. A `.battle-sim-body` wrapper holding the error and the route cards is `flex:1; min-height:0; overflow-y:auto`, so it is the only scroller. poi's own wrappers (`.poi-app-tabpane`, its `.bp6-card`) scroll on overflow; the panel sets `overflow:hidden` on just the wrappers that contain it (via `:has`), so no outer scrollbar appears. This works only if poi's plugin container has a bounded height.
- **Fallback:** if it doesn't, found by checking in a running poi during the first task, the controls bar gets `position:sticky; top:0` with the panel background, and the body is left to the outer scroller.
- **Alternative considered:** sticky only. It's simpler, but under sticky the error and results can't scroll on their own, and the bar needs an opaque background that matches both of poi's themes. Flex first, sticky as a fallback.

### Status area is a component, fed from `RunState`
A new `StatusArea` inside the controls bar renders from `run`. It shows:
- a spinner and "Routes…" while predicting;
- `n / total` with a `ProgressBar` (`value = finished/total`) while simulating;
- the fetch note, short label with the full text in a `Tooltip`;
- the development-optimizer `Icon` with a `Tooltip`;
- "Done".

"Done" hides on a 3-second `setTimeout` started in a `useEffect` keyed on the run reaching `done`, and cleared on unmount or a new run. It stays out of the reducer, because it is presentation only.

A single button replaces Simulate and Cancel: `running ? Cancel : Simulate`, with the same handlers as today.

### Rate values: cumulative ranks replace `bOrWorse`
- `aggregate.ts` keeps per-rank weighting. It drops `shipLostSimulated`, and with it `player_sunk_any_rate`, which `readDiag` stops requiring.
- `aggregate.ts` replaces `bOrWorse` with `aOrBetter(r) = S+A` and `bOrBetter(r) = S+A+B`.
- `RateCells` in `views.ts` becomes `{ reachBoss, s, aPlus, bPlus, bossSunk, sAtBoss, aPlusAtBoss, bPlusAtBoss }`.

Applying the cumulative helpers to the conditional ranks gives the right "when reached" values, because they're sums over the same denominator. The overall conditional rates still come from `aggregate`'s `ranks / reachBoss`, per the battle-simulation spec.

### Retreats from `per_node_reach` and `_meta.route`
- `SimulateDiag` gains:
  - `per_node_reach: number[]`, indexed by battle node;
  - `route: { node: string; battleIndex: number | null }[]`, read from `_meta.route`. Only `node` and `battle_index` are kept, because `kind` isn't needed for display.
- `readDiag` requires both fields, and requires each `battle_index` to be null or a valid index into `per_node_reach`. Otherwise it raises `OPTIMIZER_SCHEMA`.
- `readDiag` can't see the route the plugin asked for, so `runner.ts` checks that `route` nodes equal `nodes.slice(1)`, right after the result. A mismatch throws the same error. This keeps `runSimulate`'s options unchanged.
- `views.ts` gets `routeReach(diag)`:
  - It walks `route` backwards. A position with a battle index takes `per_node_reach[i]`. A position without one takes the value carried from the next position, starting from `reach_boss_rate` at the end.
  - Walking backwards gives the "a node without a battle takes the next battle's value" rule in one pass.
- `views.ts` gets `retreats(...)`. It returns `{ node, rate }` for each node whose drop to the next node rounds to at least 0.1%. Smaller drops would render as "−0.0%". Pass-through nodes have no drop, so they never appear.
- **Alternative considered:** filtering non-battle nodes out of the route on the plugin side using the optimizer's kcnav cache (`_map.json`). That works with 0.2.0, but it couples the plugin to a private cache format. The optimizer fix also helps every other caller.

### Route cards replace `RouteTable.tsx`
`RouteCards.tsx` lays out each card as a three-column grid:
- the route probability;
- a stepper: node circles spread over a CSS track (`::before`), the boss circle in its own color. A route's retreat rates (`retreats(routeReach(diag))`) hang under their nodes. In a run of neighboring labels every other one drops to a second line, so they never overlap at 400px;
- S / A+ / B+ / boss sunk among trials that reached the boss.

Cards show no rates over all trials: those are the summary's job, and showing both denominators on a card was what made the old table hard to read. `RateCells` gains `bossSunkAtBoss` (boss sunk over reach boss) so the card's right column shares one denominator. `RouteTable.tsx` is deleted.

### Result header and staleness
- `ResultHeader` is rendered from `run.input`, `run.snapshot` and the current `inputs`.
- The margin of error is `98 / Math.sqrt(trials)`, computed in `views.ts`. It is the worst-case 95% interval for one route's rate (p = 0.5).
- `isStale(runInput, current)` compares `fleetId`, `map`, `trials`, and the branch/phase values for that map key by key. It lives in `views.ts` with a unit test.
- When stale, the header, summary and cards are wrapped in `.battle-sim-stale` (reduced opacity) together with a note.

### Fleet view model additions
- `ShipView` gains `hp`, `maxHp`, `damage: 'none' | 'minor' | 'moderate' | 'heavy'` and `morale`.
  - Damage uses integer comparisons (`hp*4 <= maxHp` → heavy, and so on), avoiding float edge cases.
  - Damage state is computed from the HP ratio alone. Ships at 0 HP can't be in a sortie fleet, so that case is not handled separately.
- `FleetViewModel` gains `damagedCount`.
- The LoS multiplier for a map comes from `losMultiplier(map)`, a small table in `model.ts` that moves the data out of `FleetView.tsx`'s hover text.
- `buildFleetViewModel` takes the map. For a live view this is `inputs.map`, and for a snapshot `run.input.map`, so a snapshot's LoS doesn't follow later map changes.
- Ship rows follow poi's fleet tab and reuse poi's own styling, which `global.css` provides in the main window and in plugin windows:
  - HP is a Blueprint `ProgressBar` with intent `green`/`yellow`/`orange`/`red`, which poi's CSS colors with its HP palette.
  - Morale uses poi's `poi-ship-cond poi-ship-cond-<band>` classes for the colored square; `moraleBand` in `model.ts` mirrors poi's `getCondStyle` bands.
  - Equipment is icon-only; name, ★ and proficiency move into the icon's tooltip.

### Inputs
- Fleet names come from the live store's `info.fleets[].api_name`, which `useLiveState` already selects. They are passed to `Controls` as a 4-entry label list.
- `TRIAL_PRESETS = [500, 2000, 10000]` goes in `inputs.ts`. The saved value and its clamping are unchanged, so existing configs keep working.
- `Controls` keeps a local `custom` flag, initialised to "value is not a preset". Choosing Custom shows the number field even when the current value equals a preset.

## Risks / Trade-offs

- [poi's container may not give the panel a fixed height, so the inner scroller never activates] → Check in the first task in a running poi; fall back to sticky.
- [Dropping "ship lost" hides a real risk if the optimizer ever advances on 大破] → The 0.2.0 recording suggests the optimizer retreats on 大破 (`player_sunk_any_rate` 0.0 while reach falls to 0.59). Confirm against the optimizer's retreat rule before removing the field. Restore it if sinking is possible.
- [The margin of error is worst-case per route, not the exact interval of a weighted summary] → It is labelled as per route, and the worst case is stated in the spec. It's a reading aid, not a statistic to rely on.
- [Conflicts with the in-flight prefetch change in `Panel.tsx`/`state.ts`] → Apply after that change is archived (see the tasks).

## Migration Plan

No data migration. Saved fleet, map, trials and choices keep their keys and meaning. Removed i18n keys are deleted from all three tables, which the i18n test enforces. Rollback is reverting the change.

## Open Questions

- Should more maps get a non-×1 LoS multiplier (for example 1-6, 2-5 or 7-x nodes)? Only the table in `losMultiplier` changes, so the list can be extended later without touching the specs' structure.
