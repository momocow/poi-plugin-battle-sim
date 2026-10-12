## Context

See proposal.md for motivation. Current state that shapes the approach:

- **Optimizer data**: `optimizer.json` pins the binary and a data archive. `scripts/fetch-optimizer.mjs` extracts the archive into `data/` at prepublish. `resolve.ts` passes that directory as `--data-dir`. The archive holds `maps.json` (boss letters, including past events 22-x…62-x), `enemies.json`, `ships.json`, `equipment.json`, `bonuses/<map>.json` (5-6 and event maps), and so on. Unpacked it's about 5 MB.
- **kcnav**: the optimizer reads `--kcnav-dir`, laid out as `{map}/_map.json`, `{map}/{node}.json` (normal maps), and `{map}/{variant}/{node}.json` (event maps, `variant = d{diff}-g{gauge}-c{cleared}-L{min}_{max}` with `x` for unset). Today that's `<appData>/battle-sim/kcnav`, filled by `prefetch.ts` (the startup queue plus per-run fetches) and recorded in `kcnav-fetched.json`. `simulate` also fetches missing nodes on its own unless `[route] kcnav_offline = true`.
- **Event inputs to the optimizer**:
  - `[route.kcnav] difficulty / cleared / gauge / gauge_level_min / gauge_level_max` picks the variant;
  - `[route] bonus_map = "<map>"` applies `bonuses/<map>.json`, and a world ≥ 10 also switches the vanguard table to the event one;
  - `kcnav fetch` takes `--difficulty / --cleared / --min-gauge / --max-gauge / --min-gauge-level / --max-gauge-level`.
- **Plugin gates on normal maps**: `normalMaps()` in `inputs.ts` (areas 1–7), `sortieOf()` in `sortie.ts` (`^[1-7]\d$`), `isNormalMap()` in `prefetch.ts`.
- **Branch choices**: `MAP_CHOICES` in `src/routes/choices.ts`, checked against compass's `options[map]` at run time.
- **poi state**:
  - `state.info.maps[<area><no>]` has `api_cleared` and `api_eventmap { api_now_maphp, api_max_maphp, api_selected_rank, api_gauge_num, api_gauge_type }`;
  - the master data `$maps[id].api_sally_flag` says which fleet types may sortie.
- **`add-land-base-support`** (not applied yet) planned its own `kancolle-node-distance` package. This change replaces that package with the node-distances part.

## Goals / Non-Goals

**Goals:**
- One general channel for fast-changing data. Adding a new kind of data later means adding a part in `fcd/` and a reader in the plugin, with no new update mechanism.
- No kcnav request from a player for anything the snapshot covers. The plugin decides every kcnav request; the optimizer never fetches on its own.
- A normal-map run on bundled data gives the same results as today, except for 5-6, which now gets its bonus.

**Non-Goals:**
- Automation for refreshing `fcd/`: a CI crawl schedule, and how distances and thresholds are collected. This change defines the layout, seeds 1.0.0, and documents the manual refresh in `fcd/README.md`.
- Delta or partial downloads. A version is downloaded whole, which is small enough.
- Combined fleets, friend fleets, support and LBAS on event maps.

## Decisions

### D1. Package layout: a manifest of parts
`package/manifest.json`:
```json
{ "parts": {
    "optimizer":     { "format": 1, "path": "optimizer" },
    "mapChoices":    { "format": 1, "path": "map-choices.json" },
    "nodeDistances": { "format": 1, "path": "node-distances.json" },
    "eventGauges":   { "format": 1, "path": "event-gauges.json" },
    "kcnav":         { "format": 1, "path": "kcnav" } } }
```
- **Readers**: the plugin has a table of the parts it needs and the format each reader supports. Unknown parts are ignored. A missing needed part, or one in an unsupported format, makes the version unusable (spec: Usable version).
- **Versioning**: adding a part is a minor version. A breaking change to a part either bumps the major, or ships the new format as a **second part** (for example `optimizer2`) next to the old one for a transition period. Old plugins keep reading the old part, so the change stays minor. That's the intended path for optimizer data format changes, because they come with optimizer binary updates that only new plugin versions have.
- **Formats**: the `kcnav` part uses the optimizer's own cache layout, and `optimizer` is the optimizer's data directory verbatim. Both are handed to the optimizer as directories, so the plugin doesn't transform them.

*Alternative:* one flat format version for the whole package. Rejected: any new kind of data would force a major version and strand every older plugin.

### D2. Which kcnav directory a run uses
Per run, `kcnavDirFor(map, variant)` returns the package's `kcnav` directory if it covers the map (`{map}/_map.json` exists, plus the variant directory for an event map). Otherwise it returns the writable `<appData>/battle-sim/kcnav`. The optimizer gets that as `--kcnav-dir`, and every simulate TOML sets `kcnav_offline = true`. The plugin's topology readers (`topology.ts`, `formation.ts`, the night-battle and battle-node checks) take the same resolved directory, so the panel, the formation defaults and the optimizer all read the same data.

Because a covered map never reads the writable directory, package data always wins (spec: Package data wins over the plugin's own fetches) without copying or deleting anything.

*Alternative:* copy the snapshot into the writable directory on install. Rejected: it duplicates about 2–10 MB per version, and mixes "fetched by me" with "shipped" in the fetched record.

### D3. Fetching what the snapshot lacks
`prefetch.ts` keeps the per-run, single-flight fetch, now keyed by `map` or `map/variant`. The `kcnav fetch` arguments gain the variant flags. `kcnav-fetched.json` keeps its existing `map → date` entries and adds `map/variant` keys. The startup queue, retry, refresh, the footer marker and the Settings button are deleted, along with their i18n strings. `fetchNormalMaps` disappears from `pluginDidLoad`.

### D4. Update mechanics: periodic check, update on approval
- **Check** (`src/gameData/check.ts`): at `pluginDidLoad`, then on a 6-hour `setInterval`, cleared in `pluginWillUnload`. It doesn't run while a download is in progress. It only reads the packument and publishes `available: version | undefined` to a small store that the panel subscribes to, the same pattern as the run state the footer reads. It never downloads.
- **Update** (`src/gameData/update.ts`): only runs when the popup's Update button calls it. Its progress and result go to the same store.
- The interval is a fixed constant, not a setting. Six hours is often enough to catch a data release on the day it's published, and rare enough to keep registry traffic negligible.
- Fetch `https://registry.npmjs.org/poi-plugin-battle-sim-data` with `Accept: application/vnd.npm.install-v1+json`.
- Pick the highest version with the bundled major and no prerelease tag.
- If it's newer than what we have, mark it available. On approval, fetch `dist.tarball` and check `dist.integrity` (sha512 SRI).
- Gunzip with `zlib`, then extract with a minimal in-process ustar reader into `<appData>/battle-sim/game-data/.tmp-<version>/`:
  - only regular files and directories under `package/`;
  - reject absolute paths, `..`, and links;
  - cap the total unpacked size at 64 MB.
- Validate per D1, then rename the directory to `<appData>/battle-sim/game-data/<version>/`. Swap the in-memory "version in use", then delete older saved versions.
- The bundled copy is resolved via `require.resolve('poi-plugin-battle-sim-data/package.json')`.
- No shell-out to `tar`, because Windows is the main platform.
- Every failure goes to `devLog('gameData.*')`. Check failures stay silent; update failures are also shown in the popup.

**Popup** (`src/ui/DataUpdate.tsx`): the footer icon plus a popup, built like the other popups.
- The "auto-opened for version X" flag is kept in memory only, so after Later the popup opens by itself again only after a poi restart, or when a newer version turns up.
- It auto-opens only while the plugin is in view and no other popup is open. This reuses the plugin-in-view signal that Automatic runs already have (`focus.ts`).

*Alternative:* silent automatic update (the earlier plan). Rejected: the user wants to see and approve each data change. It's also easier to tell a changed result apart from a changed fleet when the user knows the data just changed.

A run captures `{ dataDir, kcnavDir, mapChoices, eventGauges, nodeDistances }` from the version in use when it starts.

### D5. Optimizer resolution
`optimizer.json` keeps pinning the data archive, and `fetch-optimizer.mjs` now extracts it into `fcd/optimizer/` (gitignored, like `platforms/*/bin/`) instead of `data/`. The plugin's own `files` drops `data`. `resolve.ts` returns `dataDir` = the dev override if set, else `<version in use>/optimizer`. `loadBossLetters` reads `maps.json` from that directory, so boss nodes follow the package.

### D6. Event maps in the panel and the run
- `mapOptions()` replaces `normalMaps()`: worlds 1–7, plus areas ≥ 21 present in `$maps`, grouped by area. The label is `"{area}-{no} (E-{no}) {name}"`. A remembered map missing from `$maps` falls back to `1-1`.
- `sortieOf()` accepts any `sortieMapId` whose area is 1–7 or ≥ 21 (area = `floor(id / 10)`, map = `id % 10`).
- Event state: a new config key `<prefix>.eventState`, `{ [map]: { difficulty?, gauge?, gaugeState? } }`, holding overrides only. `eventStateFor(map, poiState, eventGauges)` merges in the from-game values (D7). In sortie mode, overrides are ignored.
- Single-fleet gate: `api_sally_flag[0]`'s single-fleet bit. The exact bit meaning is verified in task 6.2 before relying on it. If it's unreadable, the gate allows the run.
- TOML (`simulateToml`):
  - always `kcnav_offline = true`;
  - `bonus_map = "<map>"` when `<dataDir>/bonuses/<map>.json` exists;
  - for event maps, a `[route.kcnav]` table: `difficulty`, plus `gauge` and `gauge_level_min/max` (chip: `threshold + 1 .. 99999`; last dance: `1 .. threshold`; omitted when the threshold is unknown), or `cleared = 1` alone.
  - The variant string used for fetch-keying and coverage checks is built by the same function, so the two can't drift.

### D7. From-game event state
`api_selected_rank` gives the difficulty (1 丁 … 4 甲; 0 means not selected). `api_gauge_num` gives the gauge. `api_cleared === 1` gives cleared. Otherwise, `api_now_maphp <= threshold(map, difficulty, gauge)` means last dance, `>` means chip, and no threshold means unknown, which sends no band. All of these are read from poi's live state, so a gauge break or a change of difficulty in game changes the auto-run key (spec: Event state).

### D8. Compass on event maps
The compass driver passes the run's difficulty when compass's store exposes one for the map. Task 6.3 inspects the live store. The prediction cache key adds the difficulty for event maps. If compass doesn't support a map, the existing "map not supported by compass" error applies unchanged.

### D9. Map choices from the package
`choices.ts` keeps its types and the `choiceKeys` check against compass. `MAP_CHOICES` becomes the `mapChoices` part of the version in use. The current table is the seed of `map-choices.json` format 1 in `fcd/`.

## Risks / Trade-offs

- [The snapshot lags a new event by hours or days] → In the meantime, runs fall back to one plugin fetch per variant. That's still far less kcnav load than today's per-player crawl, and it stops once a package covers the variant.
- [A malicious or broken tarball] → It's checked against the registry's sha512 integrity, extracted with a strict path whitelist and size cap, validated before it's used, and swapped in by an atomic rename.
- [The package grows past what's sensible for npm] → Most of it is the kcnav snapshot. If it gets too big, `kcnav` can later become its own package through the same part mechanism. Nothing in the plugin assumes one tarball forever.
- [Optimizer data format changes with an optimizer bump] → Ship it as a parallel part (D1) and bump the plugin's supported part. Old plugins keep the old part.
- [`api_sally_flag` and the compass difficulty option are assumptions] → Both are verified on live data (tasks 6.2, 6.3), and both fail safe: the gate allows the run, and compass falls back to its default.
- [Removing the startup queue is BREAKING for users who relied on Refresh] → The snapshot cadence replaces it. This is documented in the proposal and specs.

## Migration Plan

1. Fill `fcd/` and publish `poi-plugin-battle-sim-data@1.0.0` from it (the user publishes; the plugin depends on `file:./fcd` until then, and that must become `^1.0.0` before the plugin's own release). It holds today's optimizer 0.3.1 data, today's `MAP_CHOICES`, a kcnav snapshot of all normal maps, and empty or partial `nodeDistances` and `eventGauges`.
2. Release the plugin depending on `^1.0.0`. Existing `kcnav-fetched.json` and fetched files stay and are used only for anything the package doesn't cover.
3. Rollback: an older plugin ignores `game-data/` and `eventState`, and goes back to its own bundled data and startup fetch.
4. `add-land-base-support` is revised (`/opsx:update`) so its node distances read the `nodeDistances` part. Its separate package is dropped.

## Open Questions

- A release script for `fcd/` (version bump plus publish), like `scripts/release.mjs` does for the platform packages. Publishing by hand with `npm publish ./fcd` works until then.
