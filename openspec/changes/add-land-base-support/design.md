## Context

See proposal.md for motivation. Relevant current state:

- The optimizer (pinned 0.3.1) takes land bases in the same `simulate` TOML the plugin already writes (`src/optimizer/config.ts`):
  - `[[lbas.bases]]` with `action`, `base_radius` and `slots` (`equip_id`, `count`, `max_count`, `stars`, `proficiency`). Slots fill from slot 0; there is no way to write an empty middle slot.
  - per node `[tactics.nodes.<letter>] lbas_waves = [1, 1, 2]`: 1-based indexes into `[[lbas.bases]]`, one entry per wave, in arrival order. A node that isn't written gets no wave.
  - per node `[route.node_flags.<letter>] node_distance`. The default 1 means every base reaches the node. An out-of-range wave only causes a WARN on stderr.
  - An `Attack` base with every slot empty is a load error.
- poi keeps the bases in `state.info.airbase[]`: `api_area_id`, `api_rid`, `api_name`, `api_action_kind` (0 standby, 1 attack, 2 air defense, 3 retreat, 4 rest), `api_distance { api_base, api_bonus }`, and `api_plane_info[] { api_squadron_id, api_state, api_slotid, api_count, api_max_count }`. The equipment comes from `state.info.equips[api_slotid]` (`api_slotitem_id`, `api_level`, `api_alv`).
- Node distances: no store, master data, kcnav cache or optimizer data file has them. The game sends them only at sortie start, in `api_req_map/start` → `api_cell_data[].api_distance`. poi doesn't keep `api_cell_data`.
- In-game targets are sent in the `api_req_map/start_air_base` **request** body (`api_strike_point_<base>`), just before `api_req_map/start`. poi doesn't reduce it.
- `src/fleet/specials.ts` already listens to `game.response` for the sortie record and resets on `map/start` and `port/port`. That is the model for the new recorder.
- `add-event-map-support` (applied before this change) introduces the runtime-updated game-data package. Its `nodeDistances` part maps map → node letter → distance, and a run captures the version in use when it starts.
- Per-map node settings are poi config keys under the plugin prefix (`src/ui/inputs.ts`), popup-on-close semantics in `NodeSettings.tsx`.

## Goals / Non-Goals

**Goals:**
- One assignment source per run: the in-game record mid-sortie (when observed), else the panel. Never merge the two.
- Node distances are pure data, read from the game-data package, with no update mechanism of this change's own.
- Zero change to the TOML, and to results, for runs with no land-base wave on the route.

**Non-Goals:**
- Delivering or updating node distances. That is the game-data package's job (`add-event-map-support`).
- Tracking in-sortie plane losses of bases. poi doesn't update them from battle responses.

## Decisions

### D1. Bases sent: only those with a wave on the simulated route, renumbered
The TOML lists only Attack bases that have at least one wave on a battle node of the simulated part of the route, in base number order. `lbas_waves` indexes into that list. The base's own number from the game is not used.
*Why:* this avoids the optimizer's "Attack with empty slots" error for bases we wouldn't use anyway, and keeps the no-LBAS TOML byte-identical to today's.
*Alternative:* send every base with its in-game action (`Intercept` / `Standby` / `Rest`). That's rejected: those actions have no effect in `simulate` on normal maps, and they add error surface.

### D2. Squadron → slot mapping
Squadrons with `api_state === 1` and a known plane, in squadron order, become `slots` entries: `{ equip_id, count = api_count, max_count = api_max_count, stars, proficiency }`. Empty or relocating squadrons are dropped, since TOML can't express a gap. In-game, squadron order affects nothing the optimizer models positionally. `base_radius` = `api_base + api_bonus`, written on the base only, not per slot.

### D3. Waves → `lbas_waves`
For each base in order, wave 1 then wave 2: if the target letter is a battle node on the simulated part of the route, append the base's TOML index to that node's list. The result per node is already in arrival order (base order, then wave). These go into the existing per-node `[tactics.nodes.<letter>]` table, which `simulateToml` already builds for formation and night battle, so a node with only waves gets its own table too.

### D4. Distances in the TOML
For each battle node on the simulated route with a known distance, write `[route.node_flags.<letter>] node_distance = n`, but only when at least one base is sent (D1). Otherwise skip it, to keep the TOML identical. When unknown, omit it, so the optimizer's default of 1 means reachable. We don't pre-filter out-of-range waves. The optimizer is the one place the rule lives (spec: Land-base range check). The popup only greys out out-of-range nodes as a UI aid.

### D5. Sortie recorder for strike points and distances
Extend the existing sortie-response listener (next to `specials.ts`, as `src/fleet/landBaseSortie.ts`) with:
- `api_req_map/start_air_base`: parse `postBody` `api_strike_point_<n>` (comma-separated cell numbers, one per wave) into a pending `{ base: number, cells: number[] }[]`.
- `api_req_map/start`: adopt the pending strike points, or `[]` when none arrived (no base sent). Read `api_cell_data[]` into `cell → api_distance`, and mark the record observed.
- `api_port/port`: clear.

Cells are turned into letters with the kcnav topology at run time, the same way `cellLetters` does, so the recorder stays free of map data. Mid-sortie, the run builds its assignment from this record when `observed`, else from the panel config for the sortie's map (spec: Mid-sortie land-base assignment). The exact `postBody` key shape is to be confirmed with the developer log on a live 6-4 sortie (task 4.4). The parser tolerates `api_strike_point_1..3` with either `,`- or `_`-separated values.

### D6. Panel assignment storage
New config key `<prefix>.landBases`, shaped `{ [map]: { [baseNumber]: [wave1 | null, wave2 | null] } }`, read and validated like `formations` in `inputs.ts`. Invalid entries are dropped. The key is by base number, not by base name, because the game addresses bases by `(area, rid)`.

### D7. Distances from the game-data package's `nodeDistances` part
`distanceOf(map, letter)` returns `number | undefined`, and `knownFor(map)` says whether the part lists the map. Both read the `nodeDistances` part of the game-data snapshot the run captured at start (see `add-event-map-support`, D4), so a package update in the middle of a run doesn't affect it. The popup reads the version currently in use. A map or node the part doesn't list is unknown (spec: Land-base range check). Validation of the part (whole numbers ≥ 1) is the game-data loader's job, so this change doesn't repeat it.

*Alternative:* a separate `kancolle-node-distance` package with its own updater. It was the earlier plan, and it's dropped. The game-data package is the one channel for fast-changing data, and a second updater would duplicate it.

### D8. Land bases popup
`src/ui/LandBases.tsx` follows `NodeSettings.tsx`: a local draft, committed on close, compared to the opening state to decide on the immediate run. The node list and boss marks reuse what NodeSettings computes. The base list comes from live poi state, not the run snapshot, like the Fleet display before a run. Base changes join the auto-run key: `fleetLoadout`'s key gets a land-base part for the shown map's area (action, plane IDs, stars, counts, range; no proficiency).

## Risks / Trade-offs

- [`api_strike_point_*` request shape is assumed from memory] → The parser is tolerant, the developer log records the raw postBody, and task 4.4 verifies it on a live sortie before the mid-sortie path is relied on.
- [The `nodeDistances` part starts empty for some maps] → An unknown distance degrades to "always in range", which is today's optimizer default, and the popup says the range can't be checked. It never blocks a run.
- [Mid-sortie base plane counts are stale after earlier LBAS waves] → This is a documented non-goal, and the results may be slightly optimistic. Future work could reduce `api_air_base_attack` losses.
- [In-game base renumbering in events (more than 3 bases, other areas)] → Bases are keyed by `(area, rid)` throughout, so nothing assumes three bases.
- [A popup target that is a battle node today but not after a map rework] → It is dropped silently at TOML time (not on the route, D3), and shown as is in the popup until the user changes it.

## Migration Plan

- Additive. There's a new config key with an empty default, and runs without waves are unchanged.
- Release: after `add-event-map-support`. The game-data package's `nodeDistances` part should list at least 6-4, 6-5 and 7-4 by then (a data release, not part of this repo).
- Rollback: an older plugin version simply ignores `landBases`.
