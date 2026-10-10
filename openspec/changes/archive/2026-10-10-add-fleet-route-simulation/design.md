## Context

The project starts empty. It will be a poi plugin, which means an npm package that poi loads into its Electron renderer. The renderer gives the plugin React, poi's Redux store, `<webview>`, and Node APIs. The simulation engine is the Rust CLI in `../kancolle-fleet-optimizer`. Its machine-readable interface shipped in optimizer 0.2.0:

- `simulate --config -` reads TOML from stdin.
- `--json` makes stdout emit one JSON object per line: `start`, then exactly one `result` or `error`. Every line has `type` and `schema: 1`. Exit code 0 means a result was emitted, 1 means a runtime error with an `error` line, and 2 means a usage error reported on stderr only.
- The `result` line contains `diag`, the optimizer's existing simulate statistics object. Its fields include `ranks` (counting only trials that reached the boss), `ranks_marginal` (counting all trials), `reach_boss_rate`, `boss_sunk_rate`, and `player_sunk_any_rate`.
- `--data-dir` sets where game data is read from, and `--kcnav-dir` sets the writable cache location.
- Missing kcnav node caches are fetched automatically on a map's first run, and cache writes are safe when two processes share the directory.

Route prediction was checked live on 2026-10-10. On compass's production page, the state store is reachable at `#app.__vue_app__.config.globalProperties.$pinia._s.get('compass')`. `?predeck=` loads a deck-builder v4 fleet. `UPDATE_SELECTED_AREA(map)` recalculates `simResult`, an array of `{route: string[], rate: Big}`, within about 1.5 seconds.

## Goals / Non-Goals

**Goals:**
- A thin plugin. All battle logic stays in the optimizer, all routing logic stays in compass, and the fleet statistics in the display come from poi's own helpers.
- Each external dependency (the binary and compass) sits behind its own module with a narrow interface, so it can be replaced or fail without affecting the others.
- The plugin never sends requests to kcnav itself. Its only kcnav-related traffic is the optimizer's first-run fetch per map (topology and enemy data), which is cached.
- The parts with real logic can be tested without poi or the network: converting the fleet snapshot, interpreting routes, combining results, and parsing the optimizer's output lines.

**Non-Goals:**
- Writing our own routing rules, battle formulas, or LoS and fighter-power formulas.
- A route-prediction fallback, or manual route entry. A manual route picker is planned as a later change.
- Running anything in the background or automatically. Every run starts from a user action.
- Showing a diagram of the map.

## Decisions

### D1. Process layout: one optimizer process per route, at most 2 running at once
Each route candidate gets its own `simulate --config - --json`, with the TOML containing `[route] map` and the route's node list plus the inline `[[fleet.ships]]`. The optimizer already uses every CPU core with rayon. Running two at a time hides the startup and data-loading time without oversubscribing the CPU. Exception: on a map's first run (no `<kcnav-dir>/<map>/_map.json` yet) the first route runs alone, so its enemy data is fetched once instead of by two processes at the same time. The check is only a hint, since the optimizer fetches whatever is missing; per-node files are not checked because whirlpool nodes never get one.
- *Alternative*: one batch config with an `[[arms]]` entry per route. Rejected for v1 because batch output is built for comparing arms and its per-arm lines are newer. One process per route keeps cancel and error handling per route simple. We can revisit this once batch `--json` is shipped.

### D2. Combine results using rates over all trials
Each route's statistics are reduced to `ranks_marginal`, `reach_boss_rate`, and `boss_sunk_rate`, all of which count every trial, and then weighted by the route probability. `ranks`, which counts only trials that reached the boss, is never weighted (see the battle-simulation spec). "Lost a ship" (`player_sunk_any_rate`) is weighted only over the simulated routes, using their renormalized probabilities, and labeled accordingly. Routes that miss the boss are not simulated in v1 (D5). Rank rates at the boss are shown next to these values. Per route, they come straight from `ranks`. Overall, they are derived as the weighted `ranks_marginal` divided by the weighted `reach_boss_rate`, which is the only correct way to combine them across routes with different retreat rates. When the denominator is 0 the value is undefined and shown as "—".

### D3. Compass runs in an isolated, hidden `<webview>`
The webview uses a non-persistent partition (`partition="battle-sim-compass"`) that never shares state with poi's game view, and it is created only when a prediction is requested. Its flow:
1. Load `https://x-20a.github.io/compass/?pdz=<LZString(deck JSON)>`. `pdz` keeps the URL short.
2. After `dom-ready`, run `executeJavaScript` with a script that finds the store, checks its shape (that `UPDATE_SELECTED_AREA` is a function and `simResult` is an array), calls `UPDATE_SELECTED_AREA(map)`, checks that `Object.keys(options[map])` equals the plugin's set of choosable nodes for that map, applies each user choice with `UPDATE_OPTION_WITH_KEY(map, node, target)` (and `phase` the same way), and polls `simResult` every 250 ms until it is non-empty, giving up after 20 seconds.
3. Return `[{route, rate: String(rate)}]` and convert each rate with `Number()`.

Every failure becomes a typed error: `COMPASS_UNREACHABLE`, `COMPASS_SHAPE`, `COMPASS_UNSUPPORTED_MAP` (the map is not in compass's area list), or `COMPASS_TIMEOUT`. The error goes straight to the panel. There is no fallback and no automatic retry; the panel offers a manual Retry.
Branch and phase choices: compass stores one fixed choice per choosable node in `options[map]`, for example `"7-5": {F:"G", H:"I", O:"P"}`, and `phase` for 5-6 and 7-3. Checked live on 2026-10-10: `UPDATE_OPTION_WITH_KEY` makes compass recompute `simResult` by itself, and it does not write to compass's storage. Compass's routing returns whatever value is stored for a node without checking it against the map (`case "F": return t.F`), so an invalid value yields an off-map route — the live check's 7-5 F→H produced `…F-H-I-M` although F connects only to G and J. The valid targets are each choosable node's outgoing edges in compass's map edge table, which ships in its data bundle but is not exposed on the store or in the page. So the plugin ships its own table, `routes/choices.ts`, derived from that edge table: each normal map's choosable nodes with their targets and compass's default, plus the phase values (7-5: F → G/J, H → I/K, O → P/Q). The panel only offers those targets. The runtime key check above catches the table drifting from compass. The alternative, simulating every combination, was rejected: 4-5 and 7-5 have 8 combinations each, and players already know which branch they intend to take.

- *Alternative*: a hidden `BrowserWindow` from the main process. Rejected because it needs IPC through `@electron/remote` or the main process, while `<webview>` already works in poi's renderer.
- *Alternative*: bundling compass's JavaScript. Rejected because it has no license and no source.

### D4. Fleet display reuses poi's helpers and follows hensei-nikki's layout
The layout follows `poooi/plugin-hensei-nikki`'s `fleets-view`:
- a summary row with speed, fighter power, and LoS (Formula 33 ×1, with a hover popover for ×3 and ×4);
- then one block per ship: name, `Lv.N`, ship type, and each equipment item as `SlotitemIcon`, name, `★N`, and proficiency icon.

hensei-nikki has no license, so its code is not copied, only its layout. The values come from poi's exported helpers: `getTyku`, `getSaku33` with multipliers 1/3/4, and `getFleetSpeed`/`getSpeedLabel` from `views/utils/game-utils`. The icons come from `SlotitemIcon` in `views/components/etc/icon`, and the proficiency images from `${ROOT}/assets/img/airplane/alv{n}.png`.

One `FleetView` component renders a single view model, which can be built from two sources:
- **live**: from the poi store through a selector, for the selected fleet, and updated as the store changes;
- **snapshot**: from the `fleet-capture` snapshot plus master data, frozen when the run starts.

Both sources go through the same function that builds the view model, so the live view and the snapshot look the same. Names come from poi's i18n (`window.i18n.resources.__`), so they follow the user's language setting.
- *Alternative*: embed hensei-nikki's component directly. Rejected because there is no license and its selectors expect its own saved-data shapes.

### D5. Boss detection from bundled map data
The boss is identified from the optimizer's bundled `data/maps.json`, which lists each map's `boss_letters` (for example `"5-2": {"boss_letters": ["O"]}`). A candidate whose last node is in that list reaches the boss. Otherwise it is reported as "does not reach the boss" with its probability, and it is not simulated. The optimizer treats the last node of a route as the boss, so simulating it would produce wrong boss statistics. Reading this file needs no network access.

### D6. Finding the binary and integrity checks
`optimizer.json` in the package pins `{version, data, assets: {"win32-x64": {package, path, sha256}, …}}`, keyed by `${process.platform}-${process.arch}`. When the plugin first runs a simulation in a session, it hashes the binary for the current platform and compares it with the pinned value; the result is remembered for the session. A development override replaces the binary and data paths and skips the hash check. It is set on the plugin's poi settings page and stored as `plugin.poi_battle_sim.optimizerBin` / `.optimizerData` in poi's config (poi derives no UI from config keys, hence the settings component); the `BATTLE_SIM_OPTIMIZER_BIN` / `BATTLE_SIM_OPTIMIZER_DATA` environment variables are a fallback for a poi started from a shell. Both paths are taken from one source.

**Packaging: one npm package per platform.** Each binary ships in its own package — `poi-plugin-battle-sim-win32-x64`, `-darwin-arm64`, `-darwin-x64`, `-linux-x64` — with matching `os`/`cpu` fields, and the plugin lists all four as `optionalDependencies` at exact versions. poi installs plugins with its bundled npm (11.18 in poi 12) using `--global-style --ignore-scripts --legacy-peer-deps` and no `--omit=optional`, so npm installs only the package matching the user's machine, nested under the plugin's own `node_modules` (out of reach of poi's `repairDep`, which removes top-level non-plugin packages that fail `require`). The plugin finds the binary by resolving `<package>/package.json` from its own directory and joining the asset's `path`, then checks it against the SHA-256 pinned in the main package, so a mismatched or tampered platform package is refused. A missing platform package (an unsupported platform, or a registry mirror that hasn't synced it yet) is reported as such. The game data (`data/`, about 5 MB, 0.2 MB packed) is platform-independent and ships once, in the main package; the kcnav cache never ships (D7).

Binaries and data come from the optimizer's CI releases (`momocow/kancolle-fleet-optimizer`, tag `v<version>`: one `…-<platform>.tar.gz` per platform holding just the binary, one platform-independent `…-data.tar.gz`, and `SHA256SUMS`). `optimizer.json` is pinned by hand and committed: the release, each archive's SHA-256, and per platform the package, binary path and binary SHA-256. `scripts/fetch-optimizer.mjs`, run as `prepublishOnly`, downloads the archives with `gh` (the repo is private; only the publisher needs access), verifies archives and binaries against those pins, places each binary in `platforms/<key>/bin` and `data/` (without kcnav caches) in the main package, and refuses to run while `optimizer.json`, `platforms/*` and `optionalDependencies` disagree. Binaries and data are never committed to git. A platform package is added only once its release asset exists. The platform packages are published first, then the main package, all at the same version.

- *Alternative*: one package bundling all four binaries. Rejected because every user would download about 58 MB of binaries to use one.
- *Alternative*: a postinstall download. Impossible, because poi installs with `--ignore-scripts`.
- *Alternative*: download the binary from GitHub Releases on first use. Rejected because it adds a second network dependency besides compass, and GitHub downloads are slow or blocked for some users.

### D7. Directory layout
`cwd = <APPDATA_PATH>/battle-sim/`. Under it: `kcnav/` (passed as `--kcnav-dir`, where the optimizer caches each map's topology and enemy data on its first run, so the cache survives plugin updates) and `logs/` (passed as `--log-file`). The route cache is kept in memory for the poi session. `--data-dir` points to the bundled `data/`, which is read-only. All paths given to the optimizer are absolute.

### D8. Module layout
- `src/fleet/`: snapshot from the poi store, then conversion to TOML ships and to a deck-builder v4 document. Pure functions.
- `src/routes/`: `compass.ts` (webview driver and typed errors), `boss.ts` (boss nodes from bundled `maps.json`), and `predict.ts` (session cache).
- `src/fleet-view/`: the function that builds the view model (live or snapshot), `FleetView`, `ShipRow`, and `SlotItem`.
- `src/optimizer/`: `resolve.ts` (binary and checksum), `run.ts` (spawn, write stdin, parse output line by line, kill), and `aggregate.ts` (pure).
- `src/ui/`: the panel, its state machine (idle → predicting → simulating → done/error; simulation starts as soon as prediction succeeds), the settings page (`settingsClass`) for the development override, and i18n strings.

The plugin uses TypeScript, built to CommonJS for poi. Tests use Vitest, with fixture output files captured from the optimizer.

## Risks / Trade-offs

- [Compass is redeployed and its store or fields change] → Shape check and a typed error shown in the panel. Prediction stays unavailable until a plugin patch release, and there is no fallback by design. The planned manual route picker will cover this case.
- [Compass has no license and we automate it] → We only use the public page as a browser would, with nothing redistributed. Contact the author before public release. If they object, route prediction is removed and the manual route picker becomes the only way to enter a route.
- [The optimizer's output contract changes] → Tests use output recorded from optimizer 0.2.0, plus hand-written cases for a missing terminal line and an unknown schema. Check `schema` on every line and fail clearly on an unknown version.
- [A map's first run needs the network and takes 5–15 s while the optimizer fetches enemy data] → The panel says enemy data is being fetched until the first route finishes.
- [poi's state field names or helper signatures differ between poi versions] → Keep all store reads in the snapshot module and every helper import in the module that builds the view model, with fixtures from a real poi state dump. Declare the minimum poi version in `poiPlugin`.
- [The CPU is busy during long runs and poi's renderer slows down] → Child processes run outside the renderer, with at most 2 at a time and the default trial count kept at 2000.

## Migration Plan

This is a new plugin, so there is nothing to migrate. To roll back, uninstall or downgrade the plugin version. User data in `<APPDATA_PATH>/battle-sim/` is cache only and is safe to delete.

## Open Questions

- None open. Packaging was settled in D6: per-platform packages.
