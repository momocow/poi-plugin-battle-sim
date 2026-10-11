## Why

A run sends each ship's current HP, but every ship still starts with full fuel, ammo and planes. A fleet that hasn't resupplied after a sortie, or one mid-sortie, fights with less: low ammo cuts damage, low fuel makes the ship easier to hit, and lost planes weaken air power. The optimizer now takes all three per ship (`fuel_now`, `ammo_now`, `slots_now`), so the simulation can match the fleet's current state.

## What Changes

- The fleet snapshot captures each ship's current fuel, ammo, and planes in each main slot.
- Every run starts each ship at those values. A ship at full fuel, ammo or planes leaves that value out, which means full.
- A change to a ship's fuel, ammo or planes in the selected fleet becomes an automatic-run trigger, like HP. Examples: resupplying, using supplies in a sortie, losing planes.
- Resupplying doesn't bring the plugin's tab forward, since focus compares only the ships and equipment.
- Requires an optimizer release with these keys. The plugin's pinned optimizer (0.2.1) doesn't know them.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `fleet-capture`: the snapshot also captures current fuel, ammo and planes per main slot.
- `battle-simulation`: gains a requirement that each run starts every ship at its captured fuel, ammo and planes.
- `simulator-panel`: the Automatic runs requirement gains fuel, ammo and plane changes as a trigger.

## Impact

- `src/fleet/types.ts`: `api_fuel`, `api_bull` on `ApiShip`; `api_fuel_max`, `api_bull_max`, `api_maxeq` on `MstShip`; `fuel`, `fuelMax`, `ammo`, `ammoMax`, `planes`, `planesMax` on `ShipSnapshot`.
- `src/fleet/snapshot.ts`: capture them, and add them to the `fleetLoadout` key (not to `setup`).
- `src/fleet/toToml.ts`: write `fuel_now`, `ammo_now` and `slots_now` when below full.
- `optimizer.json`: bump to the release that has the keys.
- Tests and the store fixture.
