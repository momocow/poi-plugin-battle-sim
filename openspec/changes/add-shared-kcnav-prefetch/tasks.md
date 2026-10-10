## 1. Marker file

- [x] 1.1 Add read/write helpers for `<workDir>/kcnav-fetched.json` (map → ISO date). Updates are a synchronous read, change and write, so concurrent completions keep each other's entries. Writes go to a temp file and are renamed into place; a missing or unreadable file reads as empty.
- [x] 1.2 Tests: read missing, read corrupt, write then read, and a second map added without losing the first.

## 2. Shared per-map fetch

- [x] 2.1 Add `kcnavFetchArgs` to `src/optimizer/run.ts`: `kcnav fetch --map <m> --all-nodes --data-dir <d> --kcnav-dir <k> --log-file <logs>/kcnav-fetch-<m>.log`.
- [x] 2.2 Add `src/optimizer/prefetch.ts` with `ensureMapFetched(map, opts)`:
  - returns at once when the map is in the marker;
  - dedupes by map; different maps fetch in parallel;
  - resolves `true`/`false` and never rejects;
  - writes the marker only on exit 0;
  - uses `SpawnFn`, with no abort signal.
- [x] 2.3 Add `stopPrefetch()`: kill every running child; their requests resolve `false`.
- [x] 2.4 Add a helper that waits on a promise but rejects with `Cancelled` when a signal aborts, without touching the promise.
- [x] 2.5 Tests with a fake child:
  - two callers for the same map share one spawn;
  - two maps spawn at once, and when both finish together both are in the marker;
  - an aborted wait leaves the fetch running and the marker is still written;
  - a non-zero exit or spawn error gives `false` and no marker;
  - a map already marked spawns nothing;
  - `stopPrefetch` kills every child and gives `false`.

## 3. Runner and panel

- [x] 3.1 In `src/ui/runner.ts`, start `ensureMapFetched` after `resolveOptimizer`, before prediction. After prediction, if there are boss routes and the fetch is still pending, dispatch `predicted` with `fetchingEnemyData: true`, wait using the run's signal, then dispatch `enemyDataReady`, then simulate.
- [x] 3.2 In `src/ui/state.ts`, add the `enemyDataReady` action, which clears `fetchingEnemyData`; `routeDone` no longer clears it.
- [x] 3.3 Change the status message in `src/ui/Panel.tsx` and `i18n/{en-US,zh-TW,ja-JP}.json` to drop the "15 seconds" promise (for example "Fetching this map's enemy data, the first run may take a while").
- [x] 3.4 Export `pluginWillUnload` from `index.ts`, calling `stopPrefetch()`. Update the header comment, which says there is no background work.

## 4. Remove the old mechanism

- [x] 4.1 Remove `firstAlone` from `src/optimizer/orchestrate.ts` and its test in `test/orchestrate.test.ts`.
- [x] 4.2 Delete `src/optimizer/kcnav.ts`. Rewrite `test/kcnav.test.ts` for the marker and the reducer (the status clears on `enemyDataReady`, not on `routeDone`).

## 5. Verify

- [x] 5.1 Run `npm test` and the typecheck.
- [x] 5.2 With the real binary, run `kcnav fetch --all-nodes` on a map with a whirlpool node (for example 1-6 or 3-2) into a temp kcnav dir. Confirm it exits 0. If it fails on the whirlpool node, stop and revisit design decision 1.
- [x] 5.3 In poi, on a map with no marker: cancel during the fetch, rerun, and confirm one `kcnav-fetch-<map>.log` with no second fetch, then that the marker is written and the sims run without fetching.
