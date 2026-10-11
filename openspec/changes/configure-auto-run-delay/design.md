## Context

`Panel.tsx` debounces automatic runs with `setTimeout(simulate, AUTO_RUN_DELAY_MS)` inside the effect keyed on `autoKey`. The effect's cleanup clears the pending timer, so every new change restarts the wait. Only the constant needs to change. Config access already goes through `readConfig`/`writeConfig` in `src/poi.ts`, and keys live in `src/ui/inputs.ts` under `plugin.poi_battle_sim.*`. The settings page (`Settings.tsx`) exists because poi builds no UI from config keys.

## Goals / Non-Goals

**Goals:**
- Keep the existing debounce and replace only where its delay comes from.
- Validate the config value at the trust boundary, as `clampTrials` does for trials.

**Non-Goals:**
- A delay control in the panel itself. The setting is rarely changed, so the settings page is the right home.
- Separate delays for different kinds of change (fleet, map, or trials).

## Decisions

- **Read the delay on each scheduled run, not once at mount.** The effect calls `loadAutoRunDelay()` when it sets the timer, so a value changed on the settings page applies from the next change without a remount. A poi config read is a cheap in-memory lookup. Subscribing to config changes was considered and rejected: it adds a listener for no visible gain.
- **Validation lives in `inputs.ts`.** `loadAutoRunDelay()` returns the value when it is an integer from 0 to 60000 and `DEFAULT_AUTO_RUN_DELAY_MS` (1000) otherwise. The 60 s cap keeps a typo from silently disabling automatic runs; the Auto switch is the way to turn them off. A value of 0 still goes through `setTimeout(…, 0)`, so changes made in the same tick still coalesce into one run.
- **Settings field.** A `type="number"` input (min 0, max 60000, step 100) that keeps its own text state, like `PathSetting`. It writes the parsed integer only when the text is valid, so a half-typed or cleared field never stores garbage. The hint states the default.

## Risks / Trade-offs

- [The default goes from 800 to 1000 ms, so automatic runs feel slightly slower] → This is the requested default, and users can lower it.
- [An invalid value falls back to the default without any notice] → The settings field only writes valid values, so an invalid value can come only from editing config.cson by hand.
