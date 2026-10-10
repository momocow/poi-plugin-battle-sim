## Context

See proposal.md (Why). Today `runSimulation` (`src/ui/runner.ts`) predicts routes, guesses from `_map.json` (`isMapCached`) whether this is the map's first run, and if so runs the first route alone (`firstAlone` in `src/optimizer/orchestrate.ts`) before the rest. Each `simulate` process fetches whatever nodes its own route lacks (`fetch_missing_kcnav_nodes` in the optimizer), and writes each cache file to a temp file and renames it into place. Cancelling aborts one `AbortSignal`, which kills every process.

Facts about the pinned optimizer (0.2.0) that this design relies on:
- `kcnav fetch --map <m> --all-nodes` downloads the map layout, writes `_map.json` first, then fetches every node letter in order. Nodes already cached are skipped unless `--force` is given.
- Above 5 nodes it waits 2 s between requests. It exits non-zero if any node fails (`bail_if_failed`).
- `--kcnav-dir`, `--log-file` and `--data-dir` are global flags, so they work with any subcommand.
- `_map.json` and the `kcnav/<map>/` folder exist from the first moment of a fetch. A `simulate` run that fetched only its own route's nodes leaves them too. Neither can mean "fetch complete".

## Goals / Non-Goals

**Goals:**
- At most one kcnav fetch process per map at a time, shared by every route and every run that needs it. Different maps fetch in parallel.
- A cancel never throws away a download in progress.
- A map with only part of its cache is never treated as complete.

**Non-Goals:**
- Refreshing old caches. A fetched map stays fetched, as today. Refreshing is left to `kcnav fetch --force` by hand.
- Event-map difficulty and phase variants. The plugin sends no event options to `simulate` today, so a plain `--all-nodes` fetch writes to the same place the sims read from.
- Showing fetch progress per node, or showing a failed fetch to the user.

## Decisions

### 1. `kcnav fetch --all-nodes`, not a fetch per route
One process per map covers every route and every later run on that map, whatever branch choices are made, and it needs no node list from the plugin.
- **Alternative: `kcnav fetch --route <union>`.** This needs a list of nodes per run. It still downloads the map layout on every call, even when everything is cached. It doesn't skip whirlpool nodes, and one error stops the remaining nodes.
- **Alternative: a new `simulate --fetch-only` in the optimizer.** It would download only what the routes need and reuse the optimizer's own variant logic, but it needs an optimizer release.

The cost of `--all-nodes` is a longer first run on a map (about 2 s per node) and requests for nodes the user may never sim. Both are paid once per map.

### 2. A marker file is the only sign a fetch completed
`<workDir>/kcnav-fetched.json` holds `{ "<map>": "<ISO date of success>" }`.
- It is written only after `kcnav fetch` exits 0.
- It is written to a temp file and renamed into place, the same way the optimizer writes its cache.
- A missing or unreadable file counts as empty, so the worst case is fetching again, and already-cached nodes are skipped.
- It sits next to `kcnav/` rather than inside it, because the optimizer's `kcnav list/clear/validate` commands own that folder.
- The date is kept for diagnostics and possible refresh rules later. Nothing reads it now.
- **Alternative: `_map.json` or the folder existing.** Rejected; see Context.

### 3. A session-wide per-map fetch registry that never rejects
A module `src/optimizer/prefetch.ts` keeps, for the poi session, the fetches that are running, keyed by map. Different maps fetch in parallel: a user only ever simulates a handful of maps, and each fetch already spaces out its own requests, so a global queue would add waiting for no real benefit to kcnav.
- `ensureMapFetched(map, opts)` returns at once if the map is in the marker file.
- Otherwise it returns the promise already pending for that map, or starts a new fetch. The promise resolves to `true` (fetched) or `false` (failed). It never rejects.
- The child is started with no abort signal. Only `stopPrefetch()` kills it.
- The marker update reads, changes and writes the file synchronously, so two maps finishing at the same moment cannot overwrite each other's entry in the single renderer thread.
- A spawn error, a non-zero exit, or being killed all give `false` and leave no marker. Output goes to `logs/kcnav-fetch-<map>.log` through `--log-file`. stdout and stderr are not parsed; only the exit code matters.

The spawn uses the existing `SpawnFn` and `ChildLike` types from `src/optimizer/run.ts`, so tests can pass a fake child, as `run.test.ts` does.

### 4. Runs wait on the fetch with their own signal
`runSimulation` starts `ensureMapFetched` right after the optimizer is resolved (the fetch needs its path), before prediction, so the fetch overlaps the compass wait. After prediction:
- **If there are boss routes and the fetch is still pending:** it dispatches `predicted` with `fetchingEnemyData: true`, then waits through a small helper that rejects with `Cancelled` when the run's signal aborts and otherwise resolves with the fetch result. It then dispatches `enemyDataReady`, which clears the status, and simulates.
- **If there are no boss routes:** nothing waits, and the fetch carries on by itself.

The result is not checked: on `false` the sims fetch their missing nodes themselves, as they do today.

### 5. Remove `firstAlone` and `isMapCached`
With the cache full before any `simulate` starts, there is nothing left for running the first route alone to protect. `simulateRoutes` goes back to a plain worker pool, `src/optimizer/kcnav.ts` is removed, and its tests are moved to the marker and the per-map fetch.

### 6. Kill on plugin unload
`index.ts` exports `pluginWillUnload`, the hook poi calls when it disables or reloads a plugin, which calls `stopPrefetch()`. That kills every running child; their promises resolve `false`. A fetch is not left running after poi has stopped the plugin. If poi crashes, the child can be orphaned until it finishes on its own. The temp-file-and-rename cache writes and the missing marker make that harmless.

## Risks / Trade-offs

- **[A whirlpool node returns an error from kcnav]** → `--all-nodes` would exit non-zero and the map would never be marked fetched, so every run fetches again: cached nodes are skipped but the map layout is downloaded each time. Mitigation: test against a real map with a whirlpool (task 5.2). If it does fail, the fallback is decision 1's `simulate --fetch-only` alternative.
- **[Large maps make the first run slow]** → The status message already says the first run takes a while; its wording changes to not promise a duration.
- **[Event options added to sims later]** → The fetch must then pass the same variant flags, or the sims miss the cache and fetch on their own again. This is noted in the `prefetch.ts` header comment.
- **[A stale marker after the user deletes `kcnav/`]** → Each sim refetches what its route needs, so results stay correct; only the sharing is lost. Deleting `kcnav-fetched.json` resets it.

## Migration Plan

No data migration. Existing caches have no marker, so each map is fetched once more with `--all-nodes`, and the nodes already cached are skipped. Rollback is reverting the plugin; the marker file is then ignored.
