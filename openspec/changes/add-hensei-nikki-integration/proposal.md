## Why

Many players keep their tested fleets in `plugin-hensei-nikki` (編成日記). Today the battle-sim panel can only simulate a fleet that is formed in game right now. Players want to simulate a saved fleet without re-forming it, and to save a fleet they just simulated into hensei-nikki along with its result.

## What Changes

- The panel's fleet source can be a hensei-nikki record as well as a live fleet (1–4). The user picks a record by its title, then picks one of the fleets in it.
- A record's fleet is turned into the same snapshot as a live fleet. hensei-nikki stores ship IDs, levels, equipment IDs, improvement levels, and proficiency, but not modernization, current HP, morale, or luck. Modernization is filled in from a matching ship the player owns. HP is full and morale uses the default. Each filled-in or missing value is shown on the ship.
- The snapshot fleet of a finished run can be saved to hensei-nikki as a new record. The title is editable, and the note holds a one-line result summary (map, choices, reach-boss and S rates, date). An existing title is never overwritten without an explicit confirmation in the panel.
- The integration works only while hensei-nikki is installed and enabled. Otherwise its controls are hidden.

Depends on `add-fleet-route-simulation`. Combined fleets from a record come later, with `add-combined-fleet-support`. This change reads and writes single fleets only.

Not in this change: editing, renaming, or deleting hensei-nikki records; syncing tags; saving optimizer (`optimize`) results; importing other deck-builder files.

## Capabilities

### New Capabilities
- `hensei-nikki-integration`: Detecting hensei-nikki, reading its records into battle-sim snapshots, and writing simulated fleets back as new records.

### Modified Capabilities
- `simulator-panel`: Adds the hensei-nikki fleet source, flags for filled-in values on ships, and a Save to hensei-nikki action. (Delta written as ADDED requirements, because this capability's main spec doesn't exist until `add-fleet-route-simulation` is archived.)

## Impact

- Reads and writes hensei-nikki's Redux state through poi's shared store, using hensei-nikki's own action, so hensei-nikki keeps owning its file `<APPDATA>/hensei-nikki/<member id>.json`.
- Couples to hensei-nikki's unversioned internal state shape and action type (checked against v5.0.5). hensei-nikki has no license, but no code is copied; only its data format and action are used.
