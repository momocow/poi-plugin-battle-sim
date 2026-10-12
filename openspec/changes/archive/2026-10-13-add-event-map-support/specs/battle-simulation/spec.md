## ADDED Requirements

### Requirement: Where map and enemy data come from
A map's topology data and a node's enemy data SHALL be read from the game-data package version in use (see game-data-package). When that version doesn't cover the map, or for an event map the run's variant (see Event state per run), they SHALL be read from the plugin's own kcnav fetch of it (see Shared enemy-data fetch per map). This applies wherever a requirement refers to the map's topology data or a node's enemy data "in the kcnav cache", for example for the Target dropdown, the default formations, and the night battle settings. A run SHALL read them from the version in use when it starts.

Every simulation SHALL tell the optimizer not to fetch anything from kcnav by itself. A node the data doesn't cover then fails the route with the optimizer's error, instead of starting a request the plugin doesn't control.

#### Scenario: Normal map from the snapshot
- **WHEN** the package in use covers 5-2, and the user simulates 5-2 for the first time
- **THEN** no kcnav request is made, and the simulations use the package's 5-2 enemy data

#### Scenario: No silent fetch by the optimizer
- **WHEN** a route passes a node whose enemy data is in neither the package nor the plugin's fetch
- **THEN** the optimizer makes no kcnav request, and that route fails with an error naming the node

### Requirement: Event state per run
A run on an event map SHALL simulate one event state: a difficulty (丁, 丙, 乙 or 甲), a gauge number, and a gauge state: **chip** (消耗), **last dance** (斬殺) or **cleared** (攻略済). The state SHALL be the one in effect for the map (see simulator-panel, Event state) when the run starts. Each simulation SHALL send it to the optimizer as the kcnav variant to read:
- the difficulty and the gauge number;
- for chip and last dance, the gauge HP band, split at the gauge's last-dance threshold from the package: last dance is at or below it, chip is above. When the package has no threshold for the map, difficulty and gauge, no HP band SHALL be sent;
- for cleared, only the difficulty and that the map is cleared.

Each simulation on an event map SHALL also use the optimizer's event-map rules, which it applies from the map's number. A run on a normal map SHALL NOT send an event state.

#### Scenario: Last dance on 甲
- **WHEN** the event state for 62-3 is 甲, gauge 2, last dance, and the package gives that gauge's threshold as 4800
- **THEN** each simulation reads the 62-3 variant for difficulty 4, gauge 2, gauge HP 1 to 4800

#### Scenario: Threshold unknown
- **WHEN** the package has no last-dance threshold for 62-3 甲 gauge 2
- **THEN** each simulation reads the variant for difficulty 4 and gauge 2 with no HP band, for both chip and last dance

#### Scenario: Cleared map
- **WHEN** the event state for 62-1 is 乙, cleared
- **THEN** each simulation reads the 62-1 variant for difficulty 3, cleared

### Requirement: Map bonuses
Each simulation on a map for which the optimizer data in use has map bonuses SHALL tell the optimizer to apply that map's bonuses. A map without bonus data SHALL get none.

#### Scenario: Event bonus
- **WHEN** the optimizer data in use has bonuses for 62-4, and a fleet with a bonus ship is simulated there
- **THEN** the simulation applies 62-4's bonuses

#### Scenario: Normal map with bonuses
- **WHEN** the optimizer data in use has bonuses for 5-6
- **THEN** simulations on 5-6 apply them

### Requirement: Event maps limited to single fleets
A run on an event map that the game's map data says can't be sortied by a single fleet SHALL fail before any prediction, with an error that says combined fleets aren't supported yet on that map.

#### Scenario: Combined-only map
- **WHEN** the user simulates an event map whose game data allows only combined fleets
- **THEN** no prediction or simulation runs, and the panel says combined fleets aren't supported yet on that map

## MODIFIED Requirements

### Requirement: Shared enemy-data fetch per map
Before a map's routes are simulated, the system SHALL make sure the run's enemy data is available: for a normal map, the map; for an event map, the map's variant for the run's event state (see Event state per run). Data the game-data package version in use covers needs no fetch. Otherwise the system SHALL get the data with a single optimizer fetch of every node of the map, for that variant on an event map. Only one such fetch SHALL run per map and variant at a time. A run that needs one that is already running SHALL wait for that fetch instead of starting another. A map or variant SHALL count as fetched only after its fetch exits successfully, and that SHALL be recorded in a file in the plugin's app data directory. The presence of its files in the plugin's kcnav directory SHALL NOT count as fetched. A map or variant recorded as fetched SHALL NOT be fetched again, so the plugin asks kcnav for any one of them at most once. If the fetch fails, the run SHALL continue to simulation without showing an error. When a run is cancelled, a fetch it started or joined SHALL continue until it ends. A fetch still running when the plugin unloads SHALL be stopped.

The plugin SHALL NOT fetch enemy data for any map or variant a run doesn't need. In particular it SHALL NOT fetch maps in the background at load.

#### Scenario: Covered by the package
- **WHEN** the package in use covers 5-5, and 5-5 is simulated
- **THEN** no fetch runs

#### Scenario: Routes share one fetch
- **WHEN** an event map variant the package doesn't cover is simulated with three boss routes
- **THEN** one fetch runs for that map and variant, and the three simulations start after it ends

#### Scenario: Rerun joins a running fetch
- **WHEN** a run is cancelled while its variant's fetch is running, and the same variant is simulated again before the fetch ends
- **THEN** no second fetch starts, and the new run's simulations start after the first fetch ends

#### Scenario: Map already fetched
- **WHEN** a variant the package doesn't cover is recorded as fetched
- **THEN** no fetch runs

#### Scenario: Another variant of the same map
- **WHEN** 62-3 甲 gauge 1 is recorded as fetched, and 62-3 甲 gauge 2 is simulated and not covered by the package
- **THEN** gauge 2 is fetched

#### Scenario: Partial cache does not count
- **WHEN** the plugin's kcnav directory has files for a variant, but the variant is not recorded as fetched and the package doesn't cover it
- **THEN** the variant is fetched before simulating

#### Scenario: Fetch fails
- **WHEN** the fetch exits with an error
- **THEN** the variant is not recorded as fetched, the simulations still run, and the next run on it fetches it again

### Requirement: Optimizer binary resolution and integrity
The system SHALL use the optimizer binary for the current platform at the version pinned in the package. Before first use it SHALL verify the binary's SHA-256 checksum. On a checksum mismatch or a missing binary, it SHALL refuse to run and say why. The optimizer's data directory SHALL be the one from the game-data package version in use (see game-data-package). The plugin's settings page in poi SHALL let the user set a local optimizer binary and, optionally, its data directory for development; these are stored in poi's config. When no binary is set there, the `BATTLE_SIM_OPTIMIZER_BIN` and `BATTLE_SIM_OPTIMIZER_DATA` environment variables MAY supply them. Both paths SHALL come from the same source: a binary from config is never paired with a data directory from the environment. A development data directory, when set, SHALL be used instead of the package's optimizer data. When a development binary is in use, the checksum check is skipped and the panel shows that a development binary is in use. A change to these settings takes effect from the next run.

#### Scenario: Corrupted binary
- **WHEN** the bundled binary's checksum does not match the pinned value
- **THEN** no simulation runs and the panel reports an integrity error

#### Scenario: Development binary set in settings
- **WHEN** the user enters a local binary path on the plugin's settings page and starts a simulation
- **THEN** that binary runs without a checksum check, and the panel shows that a development binary is in use

#### Scenario: Data from the package
- **WHEN** no development data directory is set, and the game-data package 1.4.0 is in use
- **THEN** the optimizer runs with 1.4.0's optimizer data

## REMOVED Requirements

### Requirement: Normal maps are fetched when the plugin loads
**Reason**: The game-data package's kcnav snapshot carries the normal maps' enemy data, so every installation fetching all of them from kcnav is no longer needed. It put needless load on kcnav and risked an IP block.
**Migration**: None needed from the user. Maps the package covers need no fetch, and a map it doesn't cover is fetched once by the run that needs it (see Shared enemy-data fetch per map). The record of maps fetched before this version stays valid.

### Requirement: Retry failed normal maps
**Reason**: There is no startup queue left to retry.
**Migration**: A run that needs data the package lacks fetches it, and fetches it again on its next run if the fetch failed.

### Requirement: Refresh the normal maps' enemy data
**Reason**: The package's snapshot is refreshed by its publisher and reaches every player through the package's update prompt. A per-player refresh would put back the kcnav load this change removes.
**Migration**: Newer enemy data arrives with new package versions (see game-data-package, Periodic update check).
