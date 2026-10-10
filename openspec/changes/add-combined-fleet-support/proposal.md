## Why

Many players sortie combined fleets on normal maps, for example 6-4 and some 7-x maps, and for quests. `add-fleet-route-simulation` rejects combined fleets to keep v1 small. Every piece needed to support them already exists: poi tracks the combined state, the optimizer simulates all three player combined types, and compass's deck-builder input carries a second fleet.

## What Changes

- When fleets 1 and 2 are combined in game, the panel offers **Combined fleet (1+2)** as a fleet choice. The type (Carrier Task Force, Surface Task Force, or Transport Escort) is read from poi's `state.sortie.combinedFlag`, which poi updates both on returning to port and when the player combines or splits fleets.
- The snapshot captures the main fleet and the escort fleet together with the combined type.
- The optimizer receives the snapshot as `[[fleet.main]]` + `[[fleet.escort]]` with `combined_type` (`ctf` / `stf` / `tcf`).
- Compass receives a deck-builder document with `f1` + `f2` and the matching fleet type.
- The fleet display shows the main and escort fleets one after the other, each with its own summary row, under a header that names the combined type.
- **BREAKING** (relative to `add-fleet-route-simulation`): selecting a combined fleet no longer causes an error. Selecting fleet 1 or 2 on its own while they are combined still does, with a message pointing to the combined option.

Depends on `add-fleet-route-simulation` and is applied after it.

Not in this change: event-map combined fleets, enemy combined fleets as a separate option (the optimizer already takes the enemy side from map data), a 7-ship main fleet in Striking Force (遊撃部隊), and choosing a combined type different from the one set in game.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `fleet-capture`: Accepts combined fleets, captures main + escort + type, and produces combined-fleet inputs for the optimizer and compass.
- `route-prediction`: Predicts routes for combined fleets.
- `battle-simulation`: Simulates combined fleets.
- `simulator-panel`: Adds the combined fleet choice and a two-fleet display.

## Impact

- Code from `add-fleet-route-simulation`: the fleet snapshot and its converters, the compass driver (fleet type), the fleet view (two fleets), and the fleet selector.
- No new external dependencies. Compass's combined-fleet handling must be checked live before it is relied on (see design).
