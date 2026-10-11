## Why

A run sends each damaged ship's current HP to the optimizer, so its result goes out of date whenever HP changes: damage in a sortie, the next node, or a repair. But automatic runs ignore HP on purpose. After a repair or a sortie, the panel keeps showing odds for a fleet that no longer exists until the user clicks Simulate. The simulation should stay in sync with the fleet's current state.

## What Changes

- Any change to the current HP of a ship in the selected fleet, up or down, becomes an automatic-run trigger. That includes:
  - damage, on returning from a sortie or between nodes;
  - a docking that finishes, an instant repair, or a repair ship's repair;
  - a modernization or marriage that raises HP.
- **BREAKING**: returning damaged from a sortie now starts a run. So does each node during a sortie, which cancels the run before it.
- An HP-triggered run follows the same gates as every other automatic run. The Auto switch must be on and every ship must have all its main slots filled. The run waits for the auto-run delay, so several changes in a row start one run, and it cancels and restarts a run in progress.
- HP changes to ships outside the selected fleet, or made while Auto is off, start nothing, then or later. Morale, level and aircraft proficiency still start nothing.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Automatic runs requirement gains a trigger for a change to the current HP of a ship in the selected fleet. Its "changes to HP SHALL NOT start a run" rule is dropped, leaving morale, level and proficiency.

## Impact

- `src/fleet/snapshot.ts`: the `fleetLoadout` key includes each present ship's current HP.
- `src/ui/Panel.tsx`: only the header comment changes. The existing input-change effect picks HP up through the key.
- `test/fleet.test.ts`: the key test covers HP.
- `focus-on-selected-fleet-change` planned to reuse a separate HP map and `hpRose` helper, which this change no longer adds. That change needs its own update.
- No change to the optimizer, route prediction, settings page or i18n.
