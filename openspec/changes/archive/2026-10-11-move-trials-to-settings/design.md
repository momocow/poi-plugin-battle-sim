## Context

The trial count already lives in poi's config at `plugin.poi_battle_sim.trials`, but as part of the panel's `SavedInputs`: `Panel` loads it once into React state with `loadInputs()`, the `Controls` select/field edit it through `update()`, and `saveInputs()` writes it back alongside fleet, map, auto and choices. `clampTrials`, `TRIAL_PRESETS` and `isTrialPreset` in `src/ui/inputs.ts` hold the rules. The run input `current` includes `trials`, so a changed count already marks the result stale and triggers an automatic run. Other settings (`Settings.tsx`) write config directly; poi mirrors its config into the Redux store as `state.config`.

## Goals / Non-Goals

**Goals:**
- Settings page is the only place to set the count; the panel follows it live.
- Same presets, range, default and config key, so nothing needs migrating.

**Non-Goals:**
- Changing the presets or limits.
- Showing the count in the panel other than in the footer.

## Decisions

**Panel reads the count from the store.** `Panel` gets `trials` from `useSelector((s) => s.config?.plugin?.poi_battle_sim?.trials)` passed through `clampTrials`, instead of from `inputs`. A settings-page write lands in `state.config`, re-renders the panel, changes `current`, and the existing stale and auto-run logic does the rest. Alternative — reading with `readConfig` per render, like `loadAutoRunDelay` — would only see the change on the next unrelated re-render; the delay can afford that because it is read when a change is scheduled, but the trial count is part of the change key itself. `PoiState.config` in `src/fleet/types.ts` gains the path (the pending `switch-to-individual-ranks` change adds a sibling `rankDisplay`; whichever lands second merges the type).

**`trials` leaves `SavedInputs`.** `loadInputs` / `saveInputs` stop reading and writing it, so the panel can never write a stale count back over a settings-page change (today `saveInputs` writes every field on any input change). `inputs.ts` exports `TRIALS_KEY` for the settings page and the selector path.

**Settings control moves as-is.** The preset `HTMLSelect` plus custom number field moves from `Controls` into a `TrialsSetting` in `Settings.tsx`, keeping its "Custom stays chosen even when the count equals a preset" local state. Each edit writes `clampTrials(value)` only when the field holds a whole number 1–100000, the same guard `AutoRunDelaySetting` uses, so a half-typed field does not store garbage. It is not disabled during a run: the settings page has no run state, and a change mid-run restarts the run like any other input change.

## Risks / Trade-offs

- [Users looking for the trials control in the panel won't find it] → the footer still shows the run's count and margin of error; the settings page labels it with the same "Trials" / 模擬次數 text.
- [Typing a custom count on the settings page starts runs as it goes] → each keystroke restarts the auto-run delay, so only the settled value runs, as it does in the panel today.
