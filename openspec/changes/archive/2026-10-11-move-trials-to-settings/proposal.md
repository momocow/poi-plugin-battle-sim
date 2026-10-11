## Why

The trial count (模擬次數) is set once and rarely touched, yet it takes a whole row of the controls bar in a narrow, tall panel where every row taken from the route cards matters. It belongs with the plugin's other set-and-forget options on poi's settings page.

## What Changes

- The trials control — the Quick / Normal / Precise / Custom select and the custom count field — moves from the panel's controls bar to the plugin's poi settings page. The presets, the 1–100000 range and the default of 2000 stay the same.
- The controls bar loses its trials row: fleet, map, Simulate/Cancel and Auto on the first row; branch and phase choices, when the map has them, on the second.
- The count is read from poi's config, which it already lives in under the same key, so a user's remembered count carries over with no migration.
- A change on the settings page applies to the open panel at once, and counts as an input change as today: the shown result is dimmed as stale, and with Auto on a run starts after the auto-run delay (restarting a run in progress).
- The footer keeps showing the run's trial count and margin of error, now the only place the count is visible in the panel.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Inputs requirement moves the trials setting to the settings page; the layout requirement drops the trials row from the controls bar.

## Impact

- `src/ui/Controls.tsx`: trials select and field removed.
- `src/ui/Settings.tsx`: trials setting added (preset select + custom field).
- `src/ui/inputs.ts`: `trials` leaves `SavedInputs` / `loadInputs` / `saveInputs`; a `TRIALS_KEY` export and a loader take its place.
- `src/ui/Panel.tsx`: trial count read from poi's store so settings-page changes reach the panel live.
- `test/inputs.test.ts`: updated for the new shape.
