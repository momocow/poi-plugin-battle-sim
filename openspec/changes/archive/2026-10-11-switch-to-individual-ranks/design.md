## Context

`aggregate()` (`src/optimizer/aggregate.ts`) already returns per-rank `RankRates` (S–E) overall and when the boss is reached, and per-route diagnostics carry `ranks_marginal` and `ranks`. Cumulative values are derived only at the edges by `aOrBetter` / `bOrBetter`, in `src/ui/views.ts` (`rowCells`, `summaryCells`, `weightedRanks`). `Summary` and `RouteCards` render the resulting `RateCells`.

Plugin settings live under `plugin.poi_battle_sim.*` in poi's config (keys and validating loaders in `src/ui/inputs.ts`, written from `src/ui/Settings.tsx`). poi mirrors its config into the Redux store as `state.config`, and `Panel` already reads the store with `useSelector`.

## Goals / Non-Goals

**Goals:**
- One setting chooses individual or cumulative A/B everywhere the panel shows ranks, defaulting to individual.
- Switching it re-renders the current results; no re-run, no stored-result change.

**Non-Goals:**
- Showing C/D/E, or both modes at once.
- Any change to aggregation, the optimizer contract, card ordering, or the dev log (which keeps logging the cumulative values).

## Decisions

**Setting shape.** Key `plugin.poi_battle_sim.rankDisplay`, values `'individual' | 'cumulative'`, exported from `inputs.ts` as `RANK_DISPLAY_KEY`, a `RankDisplay` type and `parseRankDisplay(value: unknown): RankDisplay` (anything but `'cumulative'` → `'individual'`). A string enum over a boolean (`cumulativeRanks: true`) so the config file reads plainly and a third mode would not need a migration.

**Live via the store, not `readConfig`.** `Panel` reads the raw value with `useSelector((s) => s.config?.plugin?.poi_battle_sim?.rankDisplay)` and normalises it with `parseRankDisplay`, so a change made on the settings page re-renders the open panel. `readConfig` is a one-off read and would only update on the next unrelated re-render. `PoiState.config` in `src/fleet/types.ts` gains the `plugin.poi_battle_sim.rankDisplay?: unknown` path. Alternative — subscribing to poi's `config.set` event — duplicates what the store already does.

**Mode applied when building cells.** `rowCells(row, mode)` and `summaryCells(routes, mode)` fill mode-neutral fields `a` / `b` / `aAtBoss` / `bAtBoss` (renamed from `aPlus` / `bPlus` / …) with either `.A` / `.B` or `aOrBetter` / `bOrBetter`, via one small `rankPair(r: RankRates, mode)` helper. Components get `mode` only to choose labels (summary: `A` / `B` vs `A or better` / `B or better`; cards: `A` / `B` vs `A+` / `B+`). Alternative — carrying both sets of values in `RateCells` and choosing in each component — spreads the mode decision across two components and doubles the fields.

**Ordering untouched.** `weightedRanks` keeps using S, A or better, B or better; lexicographically that equals S, A, B, so the order is the same in both modes and does not depend on the setting.

**Settings control.** A Blueprint `RadioGroup` with the two options, saving on change like the other settings, plus a one-line hint. Labels via i18n in all three languages; ja/zh-TW individual labels `A勝利` / `B勝利` and `A 勝利` / `B 勝利`.

## Risks / Trade-offs

- [Default change makes existing users' A and B numbers drop] → the labels change with them (`A` vs `A or better`, no `+`), and the setting restores the old display.
- [`state.config` path differs in some poi version] → `parseRankDisplay` treats a missing value as the default, so the panel still works, showing individual ranks.
