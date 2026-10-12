## 1. Data package in `fcd/`

- [x] 1.1 Create `fcd/` (`package.json` for `poi-plugin-battle-sim-data@1.0.0`, `manifest.json`) and write down the package layout in `fcd/README.md`: `manifest.json` with parts `optimizer`, `mapChoices`, `nodeDistances`, `eventGauges`, `kcnav`, their format-1 schemas, and the versioning rules (adding a part is minor, a parallel part for format changes, major only when unavoidable)
- [x] 1.2 Seed format 1: optimizer 0.3.1 data, `map-choices.json` from today's `MAP_CHOICES`, a kcnav snapshot of every normal map in the optimizer cache layout, `node-distances.json` and `event-gauges.json` (may start partial)
- [x] 1.3 Publish `poi-plugin-battle-sim-data@1.0.0` to npm (done by the user with `npm publish ./fcd`; until then the plugin depends on `file:./fcd`, which must become `^1.0.0` before the plugin's next release)

## 2. Game-data package loader

- [x] 2.1 Add `poi-plugin-battle-sim-data` (`file:./fcd` for now) to `dependencies`; drop `data` from `files`; `scripts/fetch-optimizer.mjs` extracts the optimizer data into `fcd/optimizer/` (gitignored)
- [x] 2.2 `src/gameData/manifest.ts`: read and validate a version's `manifest.json` against the plugin's table of needed parts and supported formats; per-part validators (choices defaults among options, distances/thresholds integer ≥ 1, `optimizer/maps.json` readable, `kcnav` directory present)
- [x] 2.3 `src/gameData/store.ts`: bundled path via `require.resolve`, list saved versions under `<appData>/battle-sim/game-data/`, pick the newest usable, prune older ones; expose a snapshot `{ version, dataDir, kcnavDir, mapChoices, nodeDistances, eventGauges }` captured per run
- [x] 2.4 `src/gameData/tar.ts`: gunzip and ustar extraction of regular files and directories under `package/` only; reject absolute, `..` and link entries; 64 MB cap
- [x] 2.5 `src/gameData/update.ts` (check): abbreviated packument, highest same-major non-prerelease version, compare with bundled and saved versions, publish `available` to a subscribable store; run at `pluginDidLoad` and every 6 hours, skipped while updating, cleared on unload; failures to `devLog('gameData.check.*')` only
- [x] 2.6 `src/gameData/update.ts` (apply): on approval, download, sha512 SRI check, extract to a temp dir, validate, rename, swap; report progress, success or failure to the store; never awaited by a run
- [x] 2.7 Footer update icon and update popup (`src/ui/DataUpdate.tsx`): auto-open once per version per poi session while the plugin is in view and no other popup is open; Update with progress, success and failure with retry; Later keeps the icon; i18n for zh-TW / ja-JP / en-US
- [x] 2.8 Tests: version selection, prerelease and other-major skipped, integrity mismatch not saved, unknown part ignored, unsupported part format unusable, bad default unusable, corrupted saved version falls back to bundled, tar path traversal rejected, offline keeps current, the check runs on load and on the interval without downloading, a newer version found later replaces the offered one (tarball fixtures under `test/fixtures/game-data/`; fake timers for the interval)
- [x] 2.10 Settings page shows the game data version in use and whether it came with the plugin or from an update (`Settings.tsx`), following updates live
- [x] 2.9 Tests in `test/views.test.ts`: icon shown when available, popup auto-opens once per version, deferred while out of view or another popup is open, Later keeps the icon and suppresses auto-open, Update success hides the icon, failure offers retry

## 3. Optimizer data and kcnav from the package

- [x] 3.1 `resolve.ts`: `dataDir` = dev override, else the version in use's `optimizer/`; `loadBossLetters` follows it
- [x] 3.2 `kcnavDirFor(map, variant)`: the package's `kcnav` directory when it covers the map/variant, else the writable directory; use it for `--kcnav-dir` and in `topology.ts` / `formation.ts` / the battle-node and night-battle readers
- [x] 3.3 `simulateToml`: always `kcnav_offline = true`; `bonus_map` when `<dataDir>/bonuses/<map>.json` exists
- [x] 3.4 `choices.ts`: read choices from the `mapChoices` part; keep the compass key check
- [x] 3.5 Tests in `test/config.test.ts`, `test/routes.test.ts`, `test/kcnav.test.ts`: kcnav_offline always set, bonus_map for 5-6 and none for 5-5, covered map uses the package dir, uncovered map uses the writable dir, boss letters from package data, choices from the part

## 4. Fetch only what the snapshot lacks; remove the startup queue

- [x] 4.1 `prefetch.ts`: key the single-flight fetch and the fetched record by `map` or `map/variant`; skip covered maps/variants; add the variant flags to `kcnavFetchArgs`
- [x] 4.2 Remove the startup queue, retry, refresh, `fetchNormalMaps`, the footer fetch marker (`NormalMapFetchIndicator.tsx`), the Settings refresh button and their i18n strings
- [x] 4.3 Update `test/prefetch.test.ts`: covered ⇒ no fetch, another variant fetched separately, single-flight per variant, failure not recorded, no fetch at load

## 5. Event state and the TOML variant

- [x] 5.1 Types for `state.info.maps[].api_eventmap` / `api_cleared` and `$maps[].api_sally_flag` in `src/fleet/types.ts`
- [x] 5.2 `src/routes/eventState.ts`: from-game values (D7), merge with overrides, last-dance/chip from the `eventGauges` threshold, `variantOf(state)` shared by the TOML and fetch keying
- [x] 5.3 `simulateToml`: `[route.kcnav]` for event maps (difficulty, gauge, HP band or `cleared = 1`)
- [x] 5.4 Single-fleet gate before prediction, with the "combined fleets not supported yet on this map" error
- [x] 5.5 Tests: last dance with threshold, unknown threshold sends no band, cleared, normal map sends none, from-game vs override, sortie mode ignores overrides, combined-only map error

## 6. Event maps in the panel, sortie and compass

- [x] 6.1 `inputs.ts`: `mapOptions()` with event areas (≥ 21) as groups, `(E-n)` labels, remembered map falls back to 1-1; `sortie.ts` accepts event map ids
- [x] 6.3 Inspect compass's store for an event-map difficulty option; pass the run's difficulty and add it to the prediction cache key; record the finding in `compass.ts`'s header
- [x] 6.4 Event state selects next to the Target dropdown (`Controls.tsx`), `eventState` config key with per-map overrides, read-only in sortie mode, "pick a difficulty" error, footer label (e.g. "甲 G2 斬殺"), stale marking and the auto-run key
- [x] 6.5 i18n for zh-TW / ja-JP / en-US (difficulty names, gauge, chip/last dance/cleared, From game, errors)
- [x] 6.6 Tests in `test/inputs.test.ts`, `test/sortie.test.ts`, `test/views.test.ts`: event group shown and hidden, event sortie recognised, selects and From game labels, override remembered per map, gauge change triggers a run

## 7. Wrap-up

- [x] 7.1 `npm run typecheck` and `npm test` pass
- [x] 7.2 Manual check in poi: with `<appData>/battle-sim/kcnav` deleted, normal maps simulate from the package's snapshot with no startup download and no kcnav request
- [x] 7.2a Manual check in poi after publishing (1.3): publishing a newer package version shows the icon and popup within the check interval, and Update switches the next run to it
- [x] 7.3 README: the game-data package, runtime update, and event-map support; the release flow gains "publish data package first when its format changes"
- [x] 7.4 Revise `add-land-base-support` (`/opsx:update`) to read node distances from the `nodeDistances` part instead of its own package

The live-event checks (formerly 6.2 and 7.2b) moved to `verify-event-maps-live`, to be done during the next event.
