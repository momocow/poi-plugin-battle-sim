## 1. Forced fetch and the sequential queue

- [x] 1.1 In `src/optimizer/run.ts`, give `kcnavFetchArgs` a `force` option that appends `--force`.
- [x] 1.2 In `src/optimizer/prefetch.ts`, add `force` to `ensureMapFetched`'s options. A forced call ignores the record. It joins a running forced fetch, and otherwise waits for the running fetch, then starts its own. A failed forced fetch leaves the record alone.
- [x] 1.3 In `src/optimizer/prefetch.ts`, add `isNormalMap(map)` (area below 21) and `prefetchMaps(maps, opts)`:
  - Sort numerically, and drop recorded maps unless forced.
  - Fetch one map at a time through `ensureMapFetched`.
  - Stop on a `generation` change.
  - Return without doing anything if a queue is already running.
  - Update the module comment.
- [x] 1.4 In `src/optimizer/prefetch.ts`, add the status store, `queueStatus()` and `onQueueStatus(listener)` (returns an unsubscribe function), with the `running` / `failed` / `undefined` snapshot from the design:
  - A successful `markMapFetched` drops the map from `failed`.
  - A new queue replaces `failed`.
  - `stopPrefetch` clears the status.
- [x] 1.5 In `test/prefetch.test.ts`, cover:
  - `--force` in the args; a forced call on a recorded map spawns.
  - A forced call during a normal fetch waits, then spawns its own.
  - A failed forced fetch keeps the old record.
  - `isNormalMap` for 1-1, 7-5, 22-1 and 62-5.
  - The queue: one spawn at a time, in numeric order (`10-1` after `2-1`); recorded maps skipped unless forced; a failure moves on; a map a run is fetching is joined; a second `prefetchMaps` while running does nothing; `stopPrefetch` mid-queue stops it.
  - The status: the `running` sequence, with `total` counting only unrecorded maps; ending in `failed` with its maps and `force`; ending in `undefined` with no failures; a run's success dropping a map from `failed`; nothing published when every map is recorded.

## 2. Shared optimizer resolution and the entry point

- [x] 2.1 In `src/ui/runner.ts`, extract `resolveBundledOptimizer()`: package root, `optimizer.json`, `loadOptimizerOverride`, `resolveOptimizer`. `runSimulation` uses it, with no change in behavior.
- [x] 2.2 In `src/ui/runner.ts`, add `fetchNormalMaps({ force?, maps? })`. It resolves the optimizer, uses the normal maps from `loadBossLetters` unless `maps` is given, and starts `prefetchMaps` with `workDir()` without awaiting it. It rejects only when resolution fails.
- [x] 2.3 In `index.ts`, call `fetchNormalMaps()` from `pluginDidLoad`, sending a rejection to the developer log only. Update the entry comment.

## 3. Footer indicator

- [x] 3.1 Add `NormalMapFetchIndicator`, reading `queueStatus` with `useSyncExternalStore`:
  - `running`: a `Spinner` (size 12) in a top `Tooltip`, with the count and current map; the wording says refreshing when forced.
  - `failed`: a warning `Icon` in a hover `Popover`, with the failed count, the map list and a Retry `Button` that calls `fetchNormalMaps({ force, maps })`.
- [x] 3.2 Render it last in `ResultFooter`, with a `margin-left: auto` class in `src/ui/styles.ts`. Update the `ResultFooter` module comment.

## 4. Settings refresh

- [x] 4.1 In `src/ui/Settings.tsx`, add `RefreshMapsSetting`: a `Button` that calls `fetchNormalMaps({ force: true })`, and a muted note that it downloads every normal map again. While the status is `running`, the button is disabled and the note shows `{done} / {total}`. A rejection is shown under the button. Update the module comment.

## 5. Text

- [x] 5.1 Add the new strings (fetching / refreshing tooltip lines, "Now: {map}", failed count and list, Retry, the refresh button and note) to `i18n/en-US.json`, `ja-JP.json` and `zh-TW.json`.

## 6. Pacing for kcnav

- [x] 6.1 In `src/optimizer/prefetch.ts`, add `MAP_GAP_MS` (30 s) and pace `prefetchMaps` by it:
  - Wait the gap before each map after the first, and stay stoppable by `stopPrefetch`.
  - Hold until no other fetch is running.
  - Stop at the first failure, with that map and the rest in `failed`.
  - Add `waiting` to the `running` status, and a `gapMs` option for tests. Update the module comment.
- [x] 6.2 In `test/prefetch.test.ts`, update the queue tests for stop-at-first-failure and `waiting`, and cover:
  - The gap, with a short `gapMs`.
  - The hold while a run's fetch runs.
  - A stop during the gap: no later spawn.
- [x] 6.3 In `NormalMapFetchIndicator`, show "Next {map}" while waiting. In the failed popover, say "{count} maps not fetched" and "Stopped at {map}; kcnav may be refusing requests for now", and use the `cloud-download` icon. Update the i18n tables.

## 7. Verify

- [x] 7.1 Run the test suite and the type check.
- [x] 7.2 In poi, with an empty `kcnav-fetched.json`, load the plugin:
  - The normal maps fetch one at a time, and the footer spinner floats right, with its count and current map advancing.
  - Simulate a map the queue hasn't reached: its fetch starts at once, and the spinner stays right of the run's status.
  - The tooltip shows the next map during the 30 s pause, and the queue holds while a run fetches another map.
  - Make one map fail (for example, cut the network during its fetch). The queue stops there, the download marker lists that map and the rest; hover it and press Retry; the spinner returns.
  - On the settings page, press refresh. The maps download again (the log shows `--force`), the button stays disabled with its progress, and the footer shows "Refreshing".
  - Reload poi: nothing is fetched, and nothing shows in the footer.
