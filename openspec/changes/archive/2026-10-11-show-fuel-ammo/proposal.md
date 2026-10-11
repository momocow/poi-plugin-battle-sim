## Why

Since the optimizer is now sent each ship's current fuel and ammo, a ship that is not fully resupplied changes the simulated result, but the fleet display gives no hint of it. poi's own fleet tab shows fuel and ammo as two small bars per ship; the panel's fleet display already copies that tab's layout for HP and morale, so the same bars there make an under-supplied fleet obvious before the user runs a simulation.

## What Changes

- Each ship row in the fleet display gains poi's fuel and ammo bars: two thin stacked bars between the HP column and the equipment, each as long as the current/maximum ratio and coloured as poi colours them (green when full, yellow below full, orange at 75% or less, red at 50% or less).
- Hovering over a bar shows, as poi does, the resource icon, `now / max`, and when below full the resupply cost, for example `(-12)`.
- The bars follow the same source as the rest of the display: live state before a run, the frozen snapshot from the run's start afterwards.
- When the ship's maximum fuel or ammo is unknown (missing master data), that bar is left out rather than guessed.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the Fleet display requirement adds per-ship fuel and ammo bars with poi's colouring and hover detail.

## Impact

- `src/fleet-view/model.ts`: ship view model gains fuel and ammo (now, max, colour, resupply cost); built from fields the fleet snapshot already captures (`fuel`, `ammo`, `fuelMax`, `ammoMax`).
- `src/fleet-view/FleetView.tsx`, `src/ui/styles.ts`: new column in the ship grid.
- `src/poi-modules.d.ts`: declarations for poi's `getMaterialStyle` and `MaterialIcon`.
- `test/model.test.ts`: model coverage. No new dependencies, no optimizer contract change.
