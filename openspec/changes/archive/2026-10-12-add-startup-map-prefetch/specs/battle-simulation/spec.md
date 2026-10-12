## ADDED Requirements

### Requirement: Normal maps are fetched when the plugin loads
When the plugin loads, the system SHALL start, in the background, the shared enemy-data fetch (see "Shared enemy-data fetch per map") for every normal map in the bundled game data that is not recorded as fetched. A normal map is one whose area number is below 21, the game's first event area; event maps SHALL NOT be fetched at load. The fetches SHALL run one map at a time, in map order, and SHALL NOT need any action from the user. To stay within what kcnav tolerates, the queue SHALL wait about 30 seconds after one map before starting the next, and SHALL NOT start a map while a run's own fetch of any map is running; it starts once that fetch ends. Their progress is shown in the panel's footer (see simulator-panel).

A run SHALL NOT wait for the startup fetches of other maps. A run on a map whose startup fetch is running SHALL join that fetch. A run on a map the startup fetches have not reached yet SHALL fetch that map at once, and the startup fetches SHALL NOT fetch it a second time. A map whose startup fetch fails SHALL NOT be recorded as fetched. The startup fetches SHALL then stop, since kcnav is likely refusing requests, and that map and every map after it SHALL be remembered as failed. The maps that failed SHALL be remembered for the rest of the poi session, until they are fetched successfully or another queue of normal-map fetches starts. When the plugin unloads, the startup fetches SHALL stop, and no further map SHALL be fetched. If the optimizer cannot be resolved, no startup fetch SHALL run, and no error SHALL be shown for it.

#### Scenario: First load fetches the normal maps
- **WHEN** the plugin loads and no map is recorded as fetched
- **THEN** each normal map is fetched in turn, never two at once, and no event map is fetched

#### Scenario: Later load fetches nothing
- **WHEN** the plugin loads and every normal map is recorded as fetched
- **THEN** no fetch runs

#### Scenario: Run on a map the startup fetches have not reached
- **WHEN** the startup fetches are on 1-2, and the user simulates 5-5
- **THEN** 5-5's fetch starts at once, its simulations start after it ends, and when the startup fetches reach 5-5 they skip it

#### Scenario: Run on the map being fetched at startup
- **WHEN** the startup fetches are on 2-5, and the user simulates 2-5
- **THEN** no second fetch of 2-5 starts, and the run's simulations start after that fetch ends

#### Scenario: One map's fetch fails
- **WHEN** the startup fetches are on 3-4 of 1-1 to 7-5 and 3-4's fetch exits with an error
- **THEN** 3-4 is not recorded as fetched, no later map is fetched, and 3-4 to 7-5 are remembered as failed

#### Scenario: Pause between maps
- **WHEN** 1-1's startup fetch ends
- **THEN** 1-2's fetch starts about 30 seconds later

#### Scenario: Hold while a run fetches
- **WHEN** 1-1's startup fetch has ended, and a run is fetching 5-5 when the pause ends
- **THEN** 1-2's fetch starts only after 5-5's fetch ends

#### Scenario: A failed map is fetched by a run
- **WHEN** 3-2 is remembered as failed, and a later run on 3-2 fetches it successfully
- **THEN** 3-2 is no longer remembered as failed

#### Scenario: Plugin unloads mid-way
- **WHEN** the plugin unloads while the startup fetches are on a map
- **THEN** that fetch is stopped, it is not recorded as fetched, and no later map is fetched

#### Scenario: Optimizer missing at load
- **WHEN** the plugin loads and the optimizer binary is missing or fails its checksum
- **THEN** no fetch runs, the panel shows no error and no startup-fetch spinner, and the first simulation reports the optimizer error as before

### Requirement: Retry failed normal maps
The user SHALL be able to retry the normal maps that failed (see simulator-panel). A retry SHALL fetch the failed maps again the same way as the startup fetches (one at a time, in map order, with the same pause and hold, stopping at the first failure), and the same way as the queue that failed: a retry of a refresh SHALL download the maps again even if they are recorded as fetched. A map fetched successfully in the meantime SHALL be skipped. A map that fails again SHALL stay remembered as failed, with every map after it.

#### Scenario: Retry after startup failures
- **WHEN** 3-2 and 6-4 are remembered as failed, and the user retries
- **THEN** 3-2 and then, about 30 seconds later, 6-4 are fetched, and each one that succeeds is recorded as fetched and no longer remembered as failed

### Requirement: Refresh the normal maps' enemy data
The user SHALL be able to refresh the enemy data of every normal map from the plugin's settings page (see simulator-panel). A refresh SHALL download every normal map's enemy data again, overwriting the cached data, even for maps recorded as fetched. It SHALL fetch the same way as the startup fetches (one map at a time, in map order, with the same pause and hold, stopping at the first failure): runs join or skip around it as described above, and failures are remembered for a retry. A map whose refresh succeeds SHALL be recorded as fetched again. A map whose refresh fails SHALL keep its earlier record, so the data already cached stays in use. If a run's fetch of a map is running when the refresh reaches that map, the refresh SHALL wait for it and then download the map again.

Only one queue of normal-map fetches (startup, retry, or refresh) SHALL run at a time. A refresh or retry SHALL NOT be possible while one runs.

#### Scenario: Refresh after the startup fetches
- **WHEN** every normal map is recorded as fetched and the user starts a refresh
- **THEN** each normal map is downloaded again in turn, overwriting its cached enemy data, and recorded as fetched with the new date

#### Scenario: Refresh fails for one map
- **WHEN** a refresh's download of 4-5 exits with an error
- **THEN** 4-5 stays recorded as fetched from before, runs on 4-5 use the data already cached, the refresh stops, and 4-5 to 7-5 are remembered as failed for a retry

#### Scenario: Refresh while startup fetches run
- **WHEN** the startup fetches are still running
- **THEN** a refresh can't be started until they end
