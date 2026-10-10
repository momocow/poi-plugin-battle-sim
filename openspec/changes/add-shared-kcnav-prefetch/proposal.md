## Why

Each optimizer `simulate` fetches the kcnav enemy data its route is missing, so a run's parallel routes can download the same nodes at once. The "first route runs alone" workaround only dedupes the nodes on that first route. Cancelling a run also kills those processes mid-fetch, so the download is thrown away and starts over on the next run.

## What Changes

- Before simulating, the plugin makes sure the map's enemy data is fetched by one `kcnav fetch --map <map> --all-nodes` process. That process is shared: every route of the run, and any later run on the same map, waits on the same fetch instead of starting its own. Different maps fetch in parallel.
- A map counts as fetched only once that process exits 0. The plugin then records it in a marker file in its app data directory. `_map.json` and the map folder are not used, because the optimizer creates both before the fetch finishes, and a sim's own per-route fetch creates them too.
- Cancelling a run stops its sims and its wait. A fetch already running continues in the background, so the next run starts from a full cache. **BREAKING** (spec): cancel no longer stops every optimizer process the run started.
- The fetch starts alongside route prediction, so it overlaps the compass wait.
- The "fetching enemy data" status is shown while the shared fetch runs and clears when it ends, instead of when the first route finishes.
- If the shared fetch fails, the run goes on. The sims still fetch any missing node themselves, as they do today.
- Removed: the "first route runs alone" ordering and the `_map.json` check.
- A running fetch is killed when the plugin unloads.

## Capabilities

### New Capabilities

### Modified Capabilities
- `battle-simulation`: adds a requirement for the shared per-map enemy-data fetch; Cancel no longer stops the shared fetch.
- `simulator-panel`: the first-run "fetching enemy data" status follows the shared fetch instead of the first finished route.

## Impact

- `src/optimizer/kcnav.ts`: replaced by the marker file and the shared per-map fetch.
- `src/optimizer/run.ts`: a spawner for `kcnav fetch` next to `runSimulate`.
- `src/optimizer/orchestrate.ts`: `firstAlone` removed.
- `src/ui/runner.ts`, `src/ui/state.ts`, `src/ui/Panel.tsx`: start and await the fetch, and track the status.
- `index.ts`: a `pluginWillUnload` export that kills the fetch. The plugin no longer has "no background work".
- New file `<APPDATA>/battle-sim/kcnav-fetched.json`.
- Optimizer: no change. Pinned 0.2.0 already has `kcnav fetch --all-nodes` and a global `--kcnav-dir`.
- kcnav: on a map's first run, every node of the map is requested, not just the simulated routes' nodes. This is a one-time cost per map.
