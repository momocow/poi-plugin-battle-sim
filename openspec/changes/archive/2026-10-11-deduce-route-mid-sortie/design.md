## Context

A run today:
1. snapshots the fleet;
2. predicts candidates for `input.map` with compass (cached per map, choices and routing-relevant fleet);
3. starts the map's shared kcnav fetch in parallel;
4. simulates each boss candidate with `route = nodes.slice(1)`, meaning every node after the start.

`RunInput` is `{ fleetId, map, choices, trials }`. The panel compares it with the current one to dim stale results, and keys automatic runs on it plus the loadout, which includes HP.

poi's store has the sortie at `state.sortie`:
- `sortieStatus`: one boolean per fleet; both 1 and 2 when combined.
- `sortieMapId`: for example `"52"`.
- `spotHistory`: the start cell, then one cell number per node entered (`api_no` of `map/start` and each `map/next`). `currentNode` is its last entry.

A node is entered by `map/next` (with `ship_deck` for the HP after the previous battle just before it), and its battle comes after. So at every moment the store shows the fleet at a node whose battle is still ahead. All of this is reset on returning to port.

Cells are numbers, while compass and the optimizer use letters. The optimizer's kcnav cache has `<kcnavDir>/<map>/_map.json` with `route: { "<cell>": [from, to, …] }`, so a cell's letter is `route[cell][1]`, and cell 0 is the start (`"1"`). The shared kcnav fetch writes `_map.json` first, before the per-node files.

The optimizer resolves a `map` + `route` config letter by letter (`resolve_map_route`), and it allows a route that stops before the boss. Nothing in it requires the route to begin next to the start, but that has not been tried.

poi's battle store (`views/redux/battle.ts`) keeps only the current node's packets: `map/next` resets it. So it can't be read for the earlier nodes of a sortie.

## Goals / Non-Goals

**Goals:**
- One notion of "where the fleet is", read from poi's store, that drives the map, the narrowing, the simulated nodes, the trigger and staleness alike.

**Non-Goals:**
- Ships escaped or towed mid-sortie. That only happens in combined fleets and strike forces, which the snapshot does not support yet.
- Rewriting the remembered inputs. Sortie mode only changes what the selects show.

## Decisions

**Sortie as part of the effective input.** A pure `sortieOf(state, fleetId)` returns `{ map, cells }` when the fleet (or the combined fleet's first fleet) is out, else undefined. The panel builds the effective `RunInput` from it: `map` is the sortie's map and `choices` are that map's remembered choices, plus `sortie: { cells }`. The auto-run key, `isStale` and the footer all read this one value, so the trigger ("advanced a node", "came home") and the dimming come for free from the existing comparisons. The alternative was a separate sortie channel next to `RunInput`, which would need its own trigger, staleness and footer plumbing.

**Narrowing after the cache, in the runner.** `predictor.predict` stays as is, so the cache key ignores the sortie and advancing a node reuses compass's result. The runner then:
1. reads `_map.json` and maps the cells to letters, waiting for the map's kcnav fetch only when the file isn't there yet;
2. keeps the candidates whose `nodes` start with those letters, and divides each kept probability by their sum.

An empty result is the "path not predicted" error. A missing or malformed `_map.json` is a "map data unreadable" error. The filter and rescale are a pure `narrowToPath(candidates, letters)` in `src/routes/`, which is easy to test. A first mid-sortie run on a never-fetched map waits for the fetch while it shows the prediction status. Off-sortie runs keep overlapping the fetch with prediction as today.

**A branch passed is decided.** A pure `takenBranches(map, letters)` gives, for each of the map's player-chosen nodes that appear in the visited letters with a letter after them, that next letter. The runner reads the letters before predicting and predicts with `{ ...choices, ...taken }`, so a panel choice that differs from the game can't empty the narrowing. Compass's cache key includes the choices, so a decided branch that differs from the remembered one costs one compass load per sortie. The panel needs the same letters while rendering, to lock the controls and to put the taken branches in the effective input (so the auto-run key, staleness and footer agree with the run). It reads the topology synchronously through `cellLettersNow`, cached per map. Until the topology has been fetched, the controls stay unlocked, and the runner still applies the taken branches. The remembered choices are never written.

**A start index instead of slicing at 1.** `RouteRow` gains `from`, the index of the first node to simulate: 1 off-sortie, the current node's index mid-sortie. The runner passes `nodes.slice(from)` to `simulateToml`. The views use `from` to mark the nodes between 1 and `from` as passed, and to line the reach rates up with `nodes.slice(from)`. `formatRoute` still shows the whole route. One field, read in three places, replaces three hard-coded `slice(1)` calls.

**A sortie record in the plugin.** A module listens to `game.response` while the plugin is loaded. It resets on `map/start` and `port`, and records whether it has seen the sortie since its `map/start`. On each battle response (day and night, `sortie` and `combined_battle` variants), it collects the friendly attacks (`api_at_eflag == 0`): `api_at_type` entries in the day shelling phases and `api_sp_list` entries in the night shelling. It keeps only the ids the optimizer accepts (100–106, 400, 401), so a new id the game adds later can't fail every run. A run reads the list and the observed flag, and `toToml` writes `special_attacks_fired`. The alternative was reading poi's battle store, which only holds the current node. The optimizer keeps the lock and Kongou-counter rules, so the plugin passes what it saw, one entry per firing.

**Checking against the developer log afterwards.** Special attacks are rare, so the record can't be checked live. With the developer log on (`add-dev-log`), its `sortie.battle` lines carry each shelling phase's raw fields next to the ids recorded, and its `run.narrowed` lines carry the path, the kept routes and the `special_attacks_fired` passed.

**Combined fleets.** `sortieStatus` marks both fleets, and the combined fleet's sortie is fleet 1's. `sortieOf` reads it for the selected id, so this is ready once combined fleets are supported, and needs nothing else now.

## Risks / Trade-offs

- [The optimizer rejects a route that doesn't begin next to the start] → mid-sortie runs fail with its error. A task tries it first. If it fails, the fix (for example a flag allowing a tail route) goes to the optimizer repo before this is applied.
- [The plugin is loaded mid-sortie, by being turned off and on in poi's plugin settings or updated while the game keeps running] → specials fired before are unknown. Restarting poi can't cause this, because it closes the game and the sortie with it. So a run may let a special fire again (optimistic), so the run may let one fire again (optimistic). The footer says so.
- [poi or the game renames the shelling fields] → nothing is recorded, which fails open (optimistic). This is unit-tested against captured packets.
- [A run at every node] → while sortieing, each node cancels the previous run and starts one, after the delay. This was accepted with `auto-run-on-hp-change`.
- [poi renames `sortie.*` fields] → `sortieOf` returns undefined and runs fall back to the selected map from its start. This is the old behavior, not a failure. The helper is unit-tested against the current shape.
- [The kcnav fetch fails for the sortie's map] → no letters, so the run fails with "map data unreadable", where off-sortie the failed fetch was tolerated. That's unavoidable without the topology.
