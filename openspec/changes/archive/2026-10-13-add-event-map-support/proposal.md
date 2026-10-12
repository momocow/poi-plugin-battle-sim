## Why

Events are when players most need odds, and the panel can't simulate a single event map. The map list is limited to worlds 1–7. Sortie mode ignores event map ids. Every piece of map data the plugin depends on ships inside a plugin release: boss nodes and the new event's enemies and bonuses are in the optimizer's bundled data, and the branch choices are a table in the code. So a new event always needs a new release. At the same time, every installation fetches the same kcnav enemy data at load, map by map. That's wasted load on kcnav, and kcnav blocks IPs that go too fast.

The main goal is a general runtime data channel: the game-data package. Any data that changes faster than the plugin is released goes into it and reaches players without a plugin release. Event maps are its first consumer. Later, whenever some data turns out to need frequent updates, it moves into the package as a new part, with no new mechanism.

## What Changes

- **A runtime-updated game-data package** (`poi-plugin-battle-sim-data`, kept in this repo's `fcd/` folder, short for frequently changed data, and published to npm on its own schedule). It is made of named parts, each with its own format version. A plugin reads the parts it knows and ignores the rest, so adding a part is a minor version and old plugins keep working. The first parts:
  - the optimizer's whole data directory: ships, equipment, enemies, maps and boss nodes, event bonuses;
  - the plugin's map data: player-selected branches and phases, node distances from the land bases, and each event gauge's last-dance HP threshold;
  - a **kcnav snapshot**: map topology and enemy compositions for normal maps and the current event's variants.

  One version is bundled as a dependency. While poi runs, the plugin checks the npm registry for a newer compatible version at load and every 6 hours. When it finds one, the footer shows an update icon and an update popup opens by itself. If the user picks **Update**, the plugin downloads and verifies the version, saves it in poi's app data, and the next run uses it. If they pick **Later**, the icon stays for later. A new event then needs a data release only.
- **The kcnav snapshot is the primary enemy data.** The plugin stops fetching every normal map at load. It fetches from kcnav only a map, or an event variant, that the snapshot doesn't cover, at most once. Simulations run with the optimizer's automatic kcnav fetch turned off, so the plugin controls every request to kcnav.
- **Event maps in the panel**: the map list adds the current event's maps from the game data, as their own group. Single-fleet event maps can be simulated. A map that allows only combined fleets says that combined fleets aren't supported yet.
- **Event state from the game, can be overridden**: the difficulty (丁/丙/乙/甲), the gauge number, and the gauge state (chip damage / last dance / cleared) are read from poi's map info by default. Per map, the panel lets the user override them to plan other difficulties or phases. They choose the kcnav variant, the event bonus table, and compass's settings.
- **Event bonuses**: each simulation on a map that has bonus data sends it to the optimizer. This also applies the bonus that normal maps with bonuses (5-6) are missing today.
- **BREAKING**: startup fetching of normal maps, its retry, the settings-page **Refresh** button, and the fetch status in the footer are removed. The snapshot replaces them.
- **Supersedes** `add-land-base-support`'s separate `kancolle-node-distance` package. Node distances live in this package instead, and that change needs to be revised to read them from here.

Not in this change: combined fleets on event maps (they come with `add-combined-fleet-support`), friend fleets, Striking Force (遊撃部隊, 7 ships), support fleets, LBAS (comes with `add-land-base-support`), event-only special mechanics beyond what the optimizer already models, and the data package's repo and CI.

## Capabilities

### New Capabilities
- `game-data-package`: The runtime data channel: parts and their format versions, the versioning rules for adding parts, the bundled version, the update check, integrity, caching, and selecting the version in use. The first parts are listed above.

### Modified Capabilities
- `battle-simulation`:
  - the optimizer data and kcnav data come from the package;
  - enemy-data fetches only cover maps and variants the snapshot doesn't have;
  - the event variant and the bonus map are sent;
  - the startup, retry and refresh fetch queues are removed.
- `simulator-panel`:
  - event maps in the map list, and event state controls;
  - the data update icon and popup;
  - the footer fetch status and the settings-page refresh button are removed.
- `route-prediction`:
  - the branch and phase choices and the boss nodes come from the package;
  - event maps, including mid-sortie, use the run's difficulty for compass.

## Impact

- **Code**:
  - optimizer resolution: `--data-dir` and `--kcnav-dir` now point at the package version in use;
  - `scripts/fetch-optimizer.mjs`, which now extracts the pinned optimizer data archive into `fcd/optimizer/` instead of `data/`;
  - `src/routes/choices.ts`, which moves from a code table to package data;
  - `src/optimizer/prefetch.ts`, which loses the startup queue;
  - the map list, sortie detection (`sortie.ts` accepts event map ids), the simulate TOML (`[route.kcnav]`, `bonus_map`, `kcnav_offline`), Settings and the footer.
- **New dependency**: `poi-plugin-battle-sim-data` (from `fcd/`). The plugin contacts `registry.npmjs.org` once per load. kcnav traffic from players drops to the few maps and variants the snapshot lacks.
- **Release**: the data package becomes part of the release flow. A data-format change ships as a new major version alongside the optimizer binary that reads it.
- **Other changes**: `add-land-base-support` (node distances move here) and `add-combined-fleet-support` (later lifts the combined-only event-map restriction).
