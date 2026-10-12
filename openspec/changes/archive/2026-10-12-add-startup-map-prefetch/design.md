## Context

`src/optimizer/prefetch.ts` already owns the per-map fetch. `ensureMapFetched(map, opts)` joins a running fetch, skips a map recorded in `kcnav-fetched.json`, and records a map only once its fetch exits 0. `stopPrefetch()` kills running fetches and bumps `generation`, so a fetch that hasn't spawned yet never spawns. `index.ts` already calls `stopPrefetch` from `pluginWillUnload`.

A fetch needs the optimizer's `binPath` and `dataDir`, and the work directory. Today only a run resolves the optimizer, inline in `runSimulation` (`src/ui/runner.ts`), from the package root, `optimizer.json`, and the development override. The list of maps is in the bundled `maps.json`, which `loadBossLetters(dataDir)` (`src/routes/boss.ts`) already reads into an object keyed by map.

The optimizer's `kcnav fetch` skips a node whose cache file exists, unless it is given `--force`, which overwrites it (`kancolle-fleet-optimizer/src/cli.rs`, `fetch_one_node`). So clearing a map's record alone would not download anything again.

## Goals / Non-Goals

**Goals:**
- Every fetch, startup or user-triggered, goes through `ensureMapFetched`, so joining, skipping, recording, and failure handling stay in one place.
- Startup, retry, refresh and runs resolve the optimizer the same way.
- One module-level status store drives both the footer and the settings page.

**Non-Goals:**
- Fetching or refreshing event maps.
- Refreshing a single map, or refreshing automatically when data gets old.
- Refreshing the Target row when a startup fetch ends. The row appears the next time the panel renders that map.
- Failure details beyond the map list. The reason is in each map's `kcnav-fetch-<map>.log`.

## Decisions

**A forced fetch is an option of `ensureMapFetched`: `{ force: true }`.** `kcnavFetchArgs` appends `--force` when it's set. A forced call ignores the record. If a fetch of the map is already running: when that fetch is forced too, the call joins it; otherwise the call waits for it to end and then starts its own forced fetch. A successful forced fetch records the map with the new date. A failed one leaves the record alone. The cache files that weren't overwritten are still valid, and partial overwrites are per node, so the data a run reads stays usable. *Alternative:* clear the records and fetch normally. Rejected: the optimizer would skip every cached node, so nothing would be downloaded again.

**One sequential queue in `prefetch.ts`: `prefetchMaps(maps, opts & { force? })`.** It sorts the maps numerically (1-1 … 1-6, 2-1 …, 7-5). Unless forced, it drops the maps already recorded, so `total` counts only real work. Then it awaits `ensureMapFetched` for each map in turn. It captures `generation` at its start and stops once `generation` changes, so `stopPrefetch` ends it with no extra state. If a queue is already running, `prefetchMaps` returns without doing anything. That single guard enforces "one queue at a time" for startup, retry and refresh, so neither UI has to coordinate. A run's fetch is not a queue and is never blocked. *Alternative:* a separate queue module with its own stop handle. Rejected: it would duplicate what `generation` already gives.

**Pacing for kcnav: pause, hold, stop.** A test of the first version got the address blocked by tsunkit.net, which returned `401 Unauthorized` to every request. The queue had just reached 3-4 while a run fetched 6-5 in parallel. A normal map is 13–16 requests 2 s apart, so the queue now holds back in three ways:
- **Pause:** it waits `MAP_GAP_MS` (30 s) before each map after the first.
- **Hold:** before it starts a map, it waits until no other fetch is running (`fetches` is empty), re-checking after each one ends. A run's fetch never waits for the queue; the queue waits for the run's.
- **Stop:** the first `false` from `ensureMapFetched` ends the queue. That map and every map after it go into the `failed` status, since after a refusal each further map would cost a request and fail just the same.

A first startup then takes about 35 × (fetch + 30 s), roughly 25–30 minutes, in the background. The pause is a constant, not a setting. `prefetchMaps` accepts `gapMs` only so tests don't wait 30 s. While the queue pauses or holds, the status is `running` with `waiting: true` and `current` set to the next map, so the tooltip says "next" rather than "now fetching". *Alternatives:* a larger `--delay-ms` per node only slows each map and leaves the bursts across maps; telling a 401 apart from other failures needs parsing the optimizer's log. Rejected: any failure in a queue is reason enough to stop, and Retry is one click.

**Normal map = area number below 21.** The rule parses `<area>-<no>` from the `maps.json` keys and keeps areas under 21. The game numbers event areas from 21 up, and the bundled data's event maps start at 22. The rule is written once, in `prefetch.ts`, as `isNormalMap`. *Alternative:* a hard-coded list of worlds 1–7. Rejected: a new normal world would need a code change.

**Status lives in `prefetch.ts`: `queueStatus()` and `onQueueStatus(listener)`.** The queue publishes an immutable snapshot and notifies listeners on each change:

```ts
type QueueStatus =
  | { kind: 'running'; force: boolean; done: number; total: number; current: string; waiting: boolean }
  | { kind: 'failed'; force: boolean; maps: string[] }
  | undefined
```

- A map counts as done once `ensureMapFetched` settles, whatever the result.
- When a map fails, the queue stops, and the status becomes `failed` with that map and the rest. When all succeed, it becomes `undefined`.
- `force` is kept so a retry of a refresh is forced too. Without it, a failed refresh map, which is still recorded, would be skipped.
- Any successful `markMapFetched` removes that map from a `failed` status. This covers a run that fetches a failed map; when the list empties, the status becomes `undefined`.
- A new queue replaces a `failed` status: a refresh covers the failed maps anyway, and a retry is that list.
- `stopPrefetch` clears the status.

*Alternative:* dispatch status into the panel's run reducer. Rejected: queue work isn't a run, it begins before any panel mounts, it must outlive the panel, and the settings page needs it too.

**Shared optimizer resolution and one entry: `resolveBundledOptimizer()` and `fetchNormalMaps({ force?, maps? })` in `runner.ts`.**
- `resolveBundledOptimizer()` holds the package-root, `optimizer.json`, override and `resolveOptimizer` steps, moved out of `runSimulation`.
- `fetchNormalMaps` resolves the optimizer, takes the normal maps from `loadBossLetters` (or `maps`, given for a retry), and calls `prefetchMaps` with `workDir()`. It returns the promise of starting, and rejects only when resolution fails.
- The three entries:
  - **Startup:** `pluginDidLoad` calls `fetchNormalMaps()`. A rejection goes to the developer log only.
  - **Retry:** the footer popover calls `fetchNormalMaps({ force, maps })` with the `failed` status's values.
  - **Refresh:** the settings button calls `fetchNormalMaps({ force: true })`. A rejection is shown on the settings page as the error message.

The checksum is still computed once per session (`resolve.ts` caches it).

**Footer: `NormalMapFetchIndicator`, read with `useSyncExternalStore`.** React 18 (poi's runtime) has it built in, and it fits a module-level store: a panel opened partway through shows the current state at once. The component renders nothing for `undefined`. For `running`, it renders a Blueprint `Spinner` (size 12) in a top `Tooltip`: "Fetching enemy data for normal maps: {done} / {total}" (or "Refreshing …" when forced), then "Now: {map}". For `failed`, it renders a warning-colored `cloud-download` `Icon` (the triangle already marks a development optimizer) in a `Popover` with `interactionKind="hover"`, which stays open while the pointer is on it, unlike `Tooltip`. The popover holds "{n} maps not fetched", the list, "Stopped at {map}; kcnav may be refusing requests for now", and a small Retry `Button`. `ResultFooter` renders the indicator after `status`, as the last flex child, with `margin-left: auto` so it floats right even when the status area is empty.

**Settings: `RefreshMapsSetting` in `Settings.tsx`.** It's a `Button` plus a muted note, reading the same store. While the status is `running`, the button is disabled and the note shows `{done} / {total}`. A rejection from `fetchNormalMaps` is kept in local state and shown under the button in the danger color.

## Risks / Trade-offs

- [The first startup after install downloads about 35 maps from kcnav] → The fetches are sequential, paced 30 s apart, held while a run fetches, and stop at the first failure. They run once per install, since recorded maps are skipped afterwards.
- [kcnav can still refuse, for example when other tools share the address] → The queue stops after one failed map, and Retry is left to the user.
- [A refresh downloads all ~35 maps again, about as long as the first startup] → It runs only when the user presses the button, and the progress shows in both places.
- [A refresh overwrites cache files that a running simulation may read] → The optimizer writes each node file whole, and a simulation reads a node's file once at its start. At worst, a run started mid-refresh uses old data for some nodes and new data for others, which is the same state as before the change per node.
- [A run's fetch can start while the queue's fetch is downloading, so two fetches overlap] → This only happens until the queue's current map ends: the queue holds before its next map until the run's fetch is done. The run never waits for the queue.
- [Failed maps are remembered only in memory] → After a restart, the startup queue fetches every unrecorded map again anyway. A failed refresh map keeps its old data and record, so nothing is lost.
- [The first run's checksum cost moves to startup] → It's one hash per session, and the run that follows is faster by the same amount.
- [A development binary override is used for queue fetches too] → This is consistent with runs. The kcnav cache format belongs to the optimizer either way.
