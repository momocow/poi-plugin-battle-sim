## Why

Land-based air support (基地航空隊, LBAS) decides how 6-4, 6-5, 7-4 and every event map play out, and today the panel ignores it: those routes are simulated as if no base sorties, so their S and boss-sink rates come out too low to plan with. The optimizer already simulates LBAS (`[[lbas.bases]]` + `lbas_waves`), and poi already tracks the player's bases. What's missing is reading the bases, letting the player assign targets, and knowing each node's distance from the base for the range check. No source the plugin can read before a sortie has that distance.

## What Changes

- **Land base capture**: when a run starts, the snapshot also takes the land bases of the map's area from poi's state: each base's action, its range (base + bonus), and per squadron the plane, its improvement, proficiency, and current and maximum plane count.
- **Land bases popup (陸航)**: a new button next to Node settings opens a popup listing the area's bases. Like the game, each base in **Attack** (出撃) gets two wave targets picked from the map's battle nodes. Bases in any other action are shown with that action and don't sortie. Each base's range is shown. Nodes the data says are out of range can't be picked. Assignments are remembered per map. Closing the popup after a change starts a run, as Node settings does.
- **Simulation with LBAS**: each simulation sends the attacking bases and, at each node of the simulated part of the route, the waves sent there. It also sends each node's distance from the base and each base's range, so the optimizer's range check applies.
- **Mid-sortie uses the game's real assignment**: the plugin records the targets the player sent in game when the sortie started, and the node distances the game sends at sortie start. A mid-sortie run uses both instead of the panel's settings and the game-data package's distances. When the sortie start wasn't observed, the run falls back to the panel and the game-data package.
- **Node distances from the game-data package**: node distances come from the `nodeDistances` part of the runtime-updated game-data package that `add-event-map-support` introduces. That package is built from game API captures and community map data, and published from the plugin repo's `fcd/` folder. This change only reads the part: bundling, the runtime update, verification and caching all belong to that package's loader. A new map's distances therefore need only a data release.

**Depends on `add-event-map-support`** (the game-data package and its loader) and is applied after it.

Not in this change:
- air defense (防空) and enemy air raids on bases;
- base fatigue (cond);
- planes the bases lose earlier in a sortie (a mid-sortie run uses the counts poi shows);
- jet-assault bases, and editing a base's planes in the panel;
- anything specific to event maps beyond the above: land bases on event maps work once both changes are applied, and event-only base mechanics are not covered.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `fleet-capture`: Also captures the land bases of the map's area into the snapshot.
- `battle-simulation`: Sends land bases, per-node waves, node distances and base ranges to the optimizer. Mid-sortie runs use the in-game assignment and distances.
- `simulator-panel`: Adds the Land bases popup and its per-map assignments.

## Impact

- New code: land-base snapshot, the TOML for `[[lbas.bases]]`, `lbas_waves` and `[route.node_flags.<letter>] node_distance`, the Land bases popup, a recorder for `api_req_map/start_air_base` and `api_req_map/start` (alongside the specials recorder).
- No new dependency and no network access of its own. It reads the `nodeDistances` part of the game-data package from `add-event-map-support`.
- New poi config key for per-map LBAS assignments.
- Optimizer: no new flags. It uses the existing `[lbas]` and `node_distance` schema, pinned 0.3.1.
