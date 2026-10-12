## Purpose

A runtime-updated channel for every piece of data that changes more often than the plugin is released: game data, map data, enemy data. The data is published as a separate package. The plugin checks for new versions while running and installs one when the user approves it, so new data reaches players without a plugin release. Any data that turns out to need frequent updates is moved into this channel.

## ADDED Requirements

### Requirement: The package is the channel for frequently updated data
Data that changes more often than the plugin is released SHALL be delivered through the game-data package, a separately published npm package, and SHALL NOT be kept in the plugin's own code or files. A version of the package SHALL be made of named **parts**. Each part is one kind of data, with its own format version. The package SHALL say which parts it has and the format version of each.

The plugin SHALL read only the parts and part format versions it supports. It SHALL ignore parts it doesn't know. So a new kind of data can be added to the package without breaking plugin versions that predate it, and a plugin version can start using a part as soon as one is published. Data a part doesn't have counts as unknown, and the capability that reads it says what unknown means.

Adding a part, or adding data to a part in a compatible format, SHALL be a minor version of the package. Changing a part's format so that plugins that read it can no longer read it, or removing a part, SHALL be a major version.

The parts this change introduces are:
- **optimizer data**: the optimizer's data directory: ships, equipment, enemies, maps with their boss nodes, and map bonuses;
- **map choices**: per map, the player-selected branches (node, targets, default) and phases (options, default) that compass models;
- **node distances**: per map and node, the distance from the land bases;
- **event gauges**: per event map, difficulty and gauge, the gauge HP at or below which the gauge is in its last dance;
- **kcnav snapshot**: per map, its topology and, per node, its enemy compositions with their weights. For an event map, this is given per variant of difficulty, gauge number and gauge state.

#### Scenario: Branches from the package
- **WHEN** the data in use has a map-choices part listing 7-5's branch F with targets G and J and default G
- **THEN** the panel's F → control offers G and J and starts at G

#### Scenario: Part added later
- **WHEN** a package version 1.5.0 adds a part that this plugin version doesn't know
- **THEN** the plugin uses 1.5.0, reads the parts it knows, and ignores the new one

#### Scenario: Part format the plugin can't read
- **WHEN** a version's map-choices part has a format version this plugin doesn't support
- **THEN** that version is not usable, and the plugin keeps the version it had

### Requirement: Usable version
A version SHALL be usable only if every part the plugin needs is present in a format version the plugin supports, and its contents pass the plugin's checks for that part: readable, distances and HP thresholds whole numbers of at least 1, choice defaults among their options. A version that isn't usable SHALL be ignored as if it weren't there.

#### Scenario: Bad default
- **WHEN** a version's branch default isn't among its targets
- **THEN** that version is not used

### Requirement: Bundled version
The plugin package SHALL depend on the game-data package, so a version of it is installed with the plugin. That version SHALL be usable with no network access.

#### Scenario: First load offline
- **WHEN** the plugin loads for the first time with no network access
- **THEN** the bundled version is in use, and normal maps can be simulated without any kcnav request

### Requirement: Periodic update check
While the plugin is loaded, the system SHALL check the npm registry, in the background, for the newest published version of the game-data package whose major version matches the bundled one's: once when the plugin loads, then every 6 hours. A version is **available** when it is newer than every version the plugin already has (bundled or saved). A check SHALL NOT download the version, SHALL NOT change the data in use, SHALL NOT need any action from the user, and SHALL NOT block or delay a run. When a version is available, the panel offers it (see simulator-panel, Data update prompt).

A failed check SHALL show no error in the panel. The failure SHALL go to the developer log, and the next check runs on schedule. While an update is downloading, no check SHALL start.

#### Scenario: New event data published
- **WHEN** the bundled version is 1.0.0, nothing is saved, and the registry's newest 1.x version is 1.4.0 with the new event's maps
- **THEN** the next check finds 1.4.0 available, nothing is downloaded yet, and the panel offers the update

#### Scenario: Published while poi is running
- **WHEN** 1.5.0 is published 2 hours after the plugin loaded
- **THEN** the check about 6 hours after load finds it, without restarting poi

#### Scenario: New major version
- **WHEN** the bundled version is 1.0.0 and the registry's newest version is 2.0.0, with 1.4.0 the newest 1.x
- **THEN** 1.4.0 is available, and 2.0.0 is not

#### Scenario: Registry unreachable
- **WHEN** the registry can't be reached
- **THEN** no error is shown, nothing is offered, and the next check runs 6 hours later

#### Scenario: Already up to date
- **WHEN** the newest matching version on the registry is the one already saved
- **THEN** nothing is available, and nothing is offered

### Requirement: Update with the user's approval
An available version SHALL be downloaded and used only after the user approves the update (see simulator-panel, Data update prompt). On approval, the system SHALL download that version, verify its integrity against the hash the registry publishes, and check that it is usable. Only then SHALL it save the version under the plugin's app data directory and start using it. Runs that start after that SHALL use the new version. A run already in progress SHALL keep the version it started with. When a version newer than the offered one is found before the user approves, the newer one SHALL be offered instead.

A failed download, integrity check or usability check SHALL leave the data in use as it was, and SHALL NOT save the version. The failure SHALL be shown in the update prompt, with a way to try again, and SHALL go to the developer log.

#### Scenario: Approved update
- **WHEN** 1.4.0 is available and the user approves the update
- **THEN** 1.4.0 is downloaded, verified and saved, the event's maps appear in the map list without a plugin update, and the next run uses 1.4.0

#### Scenario: Update during a run
- **WHEN** the user approves an update while a run is simulating
- **THEN** that run keeps the version it started with, and the next run uses the new one

#### Scenario: Integrity mismatch
- **WHEN** the downloaded 1.4.0's hash doesn't match the one the registry publishes
- **THEN** it is not saved or used, the data in use stays as it was, and the prompt shows that the update failed with a way to try again

#### Scenario: Not approved
- **WHEN** 1.4.0 is available and the user doesn't approve it
- **THEN** nothing is downloaded, and the data in use stays as it was

### Requirement: Newest version in use
At load, the system SHALL use the newest usable version among the bundled version and the versions saved under the plugin's app data directory. Saved versions older than the one in use MAY be deleted. When the user sets a development data directory (see battle-simulation, Optimizer binary resolution and integrity), the optimizer data SHALL come from that directory. The other parts SHALL still come from the package version in use.

#### Scenario: Saved version newer than bundled
- **WHEN** the bundled version is 1.0.0, 1.4.0 is saved, and the plugin loads offline
- **THEN** 1.4.0 is in use

#### Scenario: Corrupted saved version
- **WHEN** the saved 1.4.0 can't be read or isn't usable
- **THEN** it is ignored, and the bundled version is in use

### Requirement: Package data wins over the plugin's own fetches
Enemy data fetched from kcnav by the plugin (see battle-simulation, Shared enemy-data fetch per map) SHALL be used for a map or variant only while the package version in use doesn't cover it. Once a package version covering it is in use, the package's data SHALL be used.

#### Scenario: Snapshot catches up
- **WHEN** the plugin fetched 62-3's 甲 gauge 2 variant from kcnav, and a later package version covers that variant
- **THEN** runs on that variant use the package's data
