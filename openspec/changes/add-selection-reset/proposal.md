## Why

The panel always has a fleet and a map selected, so with Auto on, every fleet change in game starts a run against the last target. A player who is done with one map and is reorganizing for the next one has no way to say "no target yet": the panel keeps simulating the old map while the fleet is half-built. A reset that clears the selection stops all of that until the player picks a new fleet and map.

## What Changes

- A Reset button in the control bar clears the fleet and map selection: both selects show an empty choice.
- Reset stops any run in progress and clears the result on screen, like Cancel. A pending automatic run is dropped.
- While the fleet or the map is not selected, Simulate is disabled, no run starts by itself, and the map's branch and phase controls are hidden. Trials and the Auto switch keep their values.
- Picking a fleet and a map again completes the selection; that counts as a change and starts an automatic run when the fleet qualifies and Auto is on.
- The fleet display shows a hint to pick a fleet while no fleet is selected. With a fleet but no map, it shows the live fleet with LoS at ×1.
- The cleared selection is remembered between poi sessions, like any other chosen fleet and map. A fresh install still starts at fleet 1 and 1-1.

## Capabilities

### New Capabilities

### Modified Capabilities
- `simulator-panel`: Inputs gains the Reset button and an unselected fleet/map; Automatic runs, Fleet display, and Progress and cancel cover the unselected state.

## Impact

- `src/ui/inputs.ts`: `SavedInputs.fleetId` / `map` become nullable, with a stored sentinel since poi's config reads `null` as missing.
- `src/ui/Panel.tsx`: reset handler (abort, clear the pending auto run, reset the run state), guards for an incomplete selection in the run, auto-run, focus and fleet-display paths.
- `src/ui/Controls.tsx`: Reset button, empty select options, Simulate disabled without a selection.
- `src/fleet-view/model.ts`: LoS multiplier ×1 when no map is selected.
- `i18n/*.json`: Reset, the empty-option labels, and the fleet hint in en-US, ja-JP, zh-TW.
- `test/inputs.test.ts`: load/save of the cleared selection.
