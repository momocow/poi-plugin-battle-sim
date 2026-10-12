## Why

A map's enemy data is fetched the first time the map is simulated, so that first run waits on a full kcnav download, and the Target row stays hidden until it ends. For the normal maps, which players run all the time, that wait can be paid ahead of time. Doing it once, in the background, when poi starts keeps it off the first run.

## What Changes

- When the plugin loads, it fetches the enemy data of every normal map (worlds 1–7, the areas below the event areas) that isn't recorded as fetched yet. It does this in the background, one map at a time.
- The fetch is the same shared per-map fetch a run uses (`ensureMapFetched`). A run on a map that the startup queue is fetching joins that fetch. A run on a map the queue hasn't reached yet fetches it right away, and the queue skips it later.
- Maps recorded as fetched are skipped, so after the first startup nothing is downloaded.
- A failed map is not recorded. The queue moves on to the next map, and the failed one is tried again at the next startup or the next run on it.
- Unloading the plugin stops the queue along with any running fetch.
- If the optimizer can't be resolved (for example, a missing or corrupt binary), the startup prefetch is skipped without showing anything. The first run reports the error as it does today.
- There's no setting for this: it is always on.
- While the startup fetches run, a small spinner floats at the right end of the panel's footer. Hovering over it shows how many maps are done out of the maps to fetch, and which map is being fetched. It disappears when the fetches end, and it never shows when there's nothing to fetch.
- If some maps failed, a warning marker takes the spinner's place. Hovering opens a popover that lists the failed maps and has a Retry button, which fetches just those maps again.
- The settings page gets a button that refreshes the enemy data of every normal map. It downloads them again with `kcnav fetch --force`, since a plain fetch skips cached nodes. Its progress and any failures show the same way. Only one queue of map fetches (startup, retry or refresh) runs at a time.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `battle-simulation`: adds requirements that the normal maps' enemy data is fetched in the background when the plugin loads, one map at a time, using the shared per-map fetch; that failed maps can be retried; and that all normal maps can be refreshed (a forced download).
- `simulator-panel`: adds the footer's fetch indicator (a spinner with a progress tooltip, then a failure marker with Retry) and the settings page's refresh button.

## Impact

- `index.ts`: `pluginDidLoad` starts the startup prefetch. `pluginWillUnload` already calls `stopPrefetch`, which will also stop the queue.
- `src/optimizer/prefetch.ts`: a sequential queue over a list of maps, built on `ensureMapFetched` and stopped by the existing `generation` counter. `ensureMapFetched` gains a forced mode. The module publishes the queue's status for the footer and the settings page to subscribe to.
- `src/optimizer/run.ts`: `kcnavFetchArgs` can pass `--force`.
- `src/ui/ResultFooter.tsx`, `src/ui/Settings.tsx`, `src/ui/styles.ts`, `i18n/*.json`: the footer indicator, the refresh button, and their text (zh-TW / ja / en).
- `src/ui/runner.ts`: the optimizer resolution (package root, `optimizer.json`, override) moves into a shared helper, so startup and runs resolve it the same way.
- The map list is read from the bundled `maps.json` in the optimizer's data directory.
- Network: on the first startup after install, about 35 sequential `kcnav fetch --all-nodes` downloads. On later startups, none. A refresh repeats the full download when the user asks for it.
- Tests: `test/prefetch.test.ts`.
