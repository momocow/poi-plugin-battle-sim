## Why

Automatic runs already wait for the inputs to settle, but the wait is a fixed 800 ms in code. That is too short for some edits, such as a multi-step equipment swap on a slow connection, and too long for players who want results right away. Making the delay a poi config setting, with a default of 1000 ms, lets each player tune it.

## What Changes

- The settle delay before an automatic run comes from a poi config key, `plugin.poi_battle_sim.autoRunDelay`, in milliseconds.
- The default is 1000 ms, up from the 800 ms now hardcoded. This is a small behavior change for everyone who keeps the default.
- A missing or invalid value (not a whole number, negative, or above 60000) falls back to 1000 ms.
- A change to the setting applies from the next input change. No poi restart is needed.
- The plugin's poi settings page gets a number field for the delay, because poi builds no UI from config keys.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Automatic runs requirement replaces "under one second" with a configurable delay that defaults to 1000 ms.

## Impact

- `src/ui/inputs.ts`: config key, default, and validated read.
- `src/ui/Panel.tsx`: the automatic-run effect reads the configured delay instead of `AUTO_RUN_DELAY_MS`.
- `src/ui/Settings.tsx`: number field for the delay.
- `i18n/*.json`: labels for the new field (en-US, ja-JP, zh-TW).
- `test/inputs.test.ts`: tests for the validated read.
