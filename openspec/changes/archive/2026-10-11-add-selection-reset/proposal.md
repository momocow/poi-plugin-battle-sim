## Why

The panel always has a fleet and a map selected, so with Auto on, every fleet change in game starts a run against the last target. A player who is done with one map and is reorganizing for the next one has no way to say "no target yet": the panel keeps simulating the old map while the fleet is half-built. A reset that clears the selection stops all of that until the player picks a new fleet and map.

## What Changes

- A Reset button in the control bar clears the fleet and map selection: both selects show an empty choice.
- Reset stops any run in progress and clears the result on screen, like Cancel. A pending automatic run is dropped.
- While the fleet or the map is not selected, Simulate is disabled, no run starts by itself, and the map's branch and phase controls are hidden. The trial count (set on the settings page), the Auto switch and each map's branch and phase choices are unchanged by Reset.
- Picking a fleet and a map again completes the selection; that counts as a change and starts an automatic run when the fleet qualifies and Auto is on.
- Reset is disabled in sortie mode, where the fleet and map are locked to the sortie. With a fleet selected but no map, a sortie by that fleet still runs in sortie mode, since sortie mode always uses the sortie's map; back in port the panel is unselected again.
- The fleet display shows a hint to pick a fleet while no fleet is selected. With a fleet but no map, it shows the live fleet with LoS at ×1.
- The cleared selection is remembered between poi sessions, like any other chosen fleet and map. A fresh install still starts at fleet 1 and 1-1.

## Capabilities

### New Capabilities

### Modified Capabilities
- `simulator-panel`: a new Selection reset requirement adds the Reset button and an unselected fleet/map, covering automatic runs, the fleet display, cancelling and sortie mode in that state.

## Impact

- `src/ui/inputs.ts`: `SavedInputs.fleetId` / `map` become nullable, with a stored sentinel since poi's config reads `null` as missing.
- `src/ui/Panel.tsx`: reset handler (abort, clear the pending auto run, reset the run state); the run target taken from the sortie when the selected fleet is on one, otherwise from a complete selection, guarding the run, auto-run, focus and fleet-display paths.
- `src/ui/Controls.tsx`: Reset button (disabled in sortie mode), empty select options, Simulate disabled without a target.
- `src/fleet-view/model.ts`: LoS multiplier ×1 when no map is selected.
- `i18n/*.json`: Reset, the empty-option labels, and the fleet hint in en-US, ja-JP, zh-TW.
- `test/inputs.test.ts`: load/save of the cleared selection.
