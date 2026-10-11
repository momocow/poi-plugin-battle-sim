## Why

Automatic runs start only on a change to the inputs, and opening the panel deliberately does not start one. So after poi starts, or after a cancelled run, switching to the plugin's tab shows an empty panel until the user clicks Simulate or changes something. When the panel has nothing to show, bringing it into view is a clear signal the user wants a result for the current fleet and map.

## What Changes

- When the plugin's tab comes into view (the user selects it, or poi's plugin auto switch brings it forward) and the panel has no run — none started since the panel opened, or the last one was cancelled — the panel starts a run by itself, as if Simulate were clicked.
- The plugin also counts as coming into view when the panel opens while its tab is already the one shown, for example when poi starts with the plugin's tab remembered.
- The focus run follows the same gates as other automatic runs: the Auto switch must be on, and every ship in the selected fleet must have all its main slots filled. It waits for the same auto-run delay, so a focus that comes with an in-game change (auto switch on an equipment swap) starts one run, not two.
- A panel that already has a run — in progress, finished, or failed — is left alone on focus, even when its result is stale.
- The rule "opening the panel SHALL NOT start a run" is narrowed: opening the panel while it is not in view still starts nothing, and the game data loading still starts nothing by itself.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Automatic runs requirement gains a trigger for the plugin coming into view while the panel has no run, and its "opening the panel SHALL NOT start a run" rule is narrowed accordingly.

## Impact

- `src/ui/Panel.tsx`: read whether the plugin's tab is shown from poi's store (`ui.activeMainTab`, or `ui.activePluginName` in poi's double-tabbed layout, compared with the plugin's id) and feed a "came into view with no run" trigger into the existing debounced automatic-run effect.
- `src/fleet/types.ts` (`PoiState`): add the `ui` slice and `config.poi.tabarea.double` (or equivalent) fields it reads.
- Tests for the pure "is the plugin shown" helper.
- No change to the optimizer, route prediction, settings page or i18n.
