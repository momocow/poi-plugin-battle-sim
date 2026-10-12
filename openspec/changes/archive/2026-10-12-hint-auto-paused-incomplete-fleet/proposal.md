## Why

Auto runs only when every ship in the selected fleet has all its main slots filled. With a slot left empty, the Auto switch still reads on, but nothing runs when the fleet or the settings change. Nothing on the panel says why, so it looks like Auto is broken.

## What Changes

- While Auto is on and the selected fleet has at least one ship with an empty main slot, the panel shows that Auto is paused:
  - the Auto switch's "on" track turns from blue to the warning colour (orange);
  - its tooltip gains a line saying that Auto is paused until every ship has all its main slots filled (the expansion slot does not count).
- While Auto is paused, the Simulate button is primary again, because clicking it is the only way to run.
- The hint updates live: filling the last empty slot clears it, and the usual automatic run starts (no change to when runs start).
- Nothing changes while Auto is off, before a fleet is picked, or for a fleet with no ships.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `simulator-panel`: adds an "Auto paused for an incomplete fleet" requirement. *Automatic runs* and *Narrow, top-down layout* stay as they are; the new requirement refines the Simulate button's emphasis for the paused case. This keeps clear of the in-progress `move-night-battle-to-node-settings` change, which modifies both of those requirements.

## Impact

- `src/ui/Panel.tsx`: work out "paused" from the existing loadout completeness and ship count, and pass it to the controls.
- `src/ui/Controls.tsx`: Auto switch class and tooltip line, plus the Simulate intent.
- `src/ui/styles.ts`: warning colour for the checked switch. Blueprint 6's `Switch` has no `intent` prop.
- `i18n/*.json`: one new string in en-US, zh-TW and ja-JP.
- No change to when runs start, to persistence, or to the optimizer.
