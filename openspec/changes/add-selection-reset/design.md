## Context

`SavedInputs` (`src/ui/inputs.ts`) always holds a fleet (1–4) and a map, and `Panel.tsx` builds a `RunInput` from them on every render. Automatic runs compare an `autoKey` (fleet, loadout, map, choices, trials) against the last one seen. `lastAutoKey` starting as `undefined` is what keeps opening the panel and the game data loading from counting as a change. poi's config cannot hold `null`: `readConfig` returns the fallback for it, so a stored `null` would come back as fleet 1 and 1-1.

The runner dispatches `cancelled` when its signal is aborted mid-run, which returns the reducer to `initialRunState`. A run that already finished or failed dispatches nothing on abort.

## Goals / Non-Goals

**Goals:**
- One place decides "is there a target": every path that can start a run (Simulate, change trigger, focus trigger) checks it.
- Reset reuses the existing cancel machinery instead of adding a parallel one.

**Non-Goals:**
- Following the game's sortie fleet or map, or picking a target automatically.
- Clearing trials, Auto, or per-map choices.

## Decisions

**Nullable selection in `SavedInputs`, stored as sentinels.** `fleetId: number | null` and `map: string | null` in memory, written to config as `0` and `''` and read back as `null`. A missing key still falls back to `1` and `'1-1'`, so fresh installs and existing users are unchanged. An alternative, a separate `selected: boolean` flag, would leave a stale fleet and map in the type that every reader must remember to ignore. Null makes the compiler point at each place that needs a guard.

**A `selection` helper returns the `RunInput` or `undefined`.** The panel computes `current` once: a `RunInput` when both are set, otherwise `undefined`. Simulate, the error view's retry, `isStale`, and both auto triggers read it, so the "incomplete selection" rule is not repeated at each site.

**Reset = abort + dispatch `cancelled` + clear the pending timer + update inputs.** Dispatching `cancelled` directly covers a finished or failed result, where the runner would dispatch nothing. It is harmless when the runner also dispatches `cancelled` after the abort. No new reducer action is needed.

**`autoKey` is the string `'unselected'` while the selection is incomplete.** Going from a full key to `'unselected'` changes the key, which drops a pending run through the existing effect, but nothing is scheduled because the effect also requires a complete selection. Going from `'unselected'` back to a full key is a change, so re-picking the same fleet and map starts a run as the spec requires. Opening the panel with a cleared selection goes from `undefined` to `'unselected'`, so the first-observation rule is kept. The alternative, resetting `lastAutoKey` to `undefined`, would make re-picking count as a first observation and start no run.

**Controls.** Each select gets a disabled `<option value="">—</option>` only while it is unselected, so the empty choice shows but cannot be picked. Reset is a minimal Blueprint `Button` next to Simulate, enabled unless both are unselected, and not disabled while running. Branch and phase controls are skipped when `map` is null (`choicesFor` is not called).

**Fleet display.** With no fleet, the section header reads "Fleet" and the body shows a muted hint ("Pick a fleet"). With a fleet and no map, the live fleet is still shown: `buildFleetViewModel`'s `map` parameter becomes `string | undefined`, and `losMultiplier(undefined)` returns 1.

## Risks / Trade-offs

- [A `failed` dispatched by the aborted run after Reset would show an error on an idle panel, because `failed` from a non-running state is accepted] → The runner turns an abort into `cancelled`, not `failed`. Verify this in poi by resetting during prediction and during simulation.
- [Users with a cleared selection who forget about it see a panel that does nothing] → The empty selects and the fleet hint make the state visible. Simulate is disabled, not hidden.
- [Old config values `0` or `''` written by a hand edit now mean "unselected" instead of falling back] → Acceptable: that is the intended meaning of the sentinel.
