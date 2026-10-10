## ADDED Requirements

### Requirement: Shared enemy-data fetch per map
Before a map's routes are simulated, the system SHALL make sure that map's enemy data is fetched by a single optimizer fetch of every node of the map. Only one such fetch SHALL run per map at a time. A run that needs a map whose fetch is already running SHALL wait for that fetch instead of starting another. A map SHALL count as fetched only after its fetch exits successfully, and that SHALL be recorded in a file in the plugin's app data directory. The presence of the map's files in the kcnav cache SHALL NOT count as fetched. A map recorded as fetched SHALL NOT be fetched again. If the fetch fails, the run SHALL continue to simulation without showing an error. When a run is cancelled, a fetch it started or joined SHALL continue until it ends. A fetch still running when the plugin unloads SHALL be stopped.

#### Scenario: Routes share one fetch
- **WHEN** a map that is not recorded as fetched is simulated with three boss routes
- **THEN** one fetch runs for the map, and the three simulations start after it ends

#### Scenario: Rerun joins a running fetch
- **WHEN** a run is cancelled while its map's fetch is running, and the same map is simulated again before the fetch ends
- **THEN** no second fetch starts, and the new run's simulations start after the first fetch ends

#### Scenario: Map already fetched
- **WHEN** a map recorded as fetched is simulated
- **THEN** no fetch runs

#### Scenario: Partial cache does not count
- **WHEN** the kcnav cache has files for a map, but the map is not recorded as fetched
- **THEN** the map is fetched before simulating

#### Scenario: Fetch fails
- **WHEN** the fetch exits with an error
- **THEN** the map is not recorded as fetched, the simulations still run, and the next run on that map fetches it again

## MODIFIED Requirements

### Requirement: Cancel
The user SHALL be able to cancel a running simulation. Cancelling SHALL stop every simulation process started for it and discard any partial results. The shared enemy-data fetch for the map SHALL NOT be stopped.

#### Scenario: Cancel mid-run
- **WHEN** the user cancels while 2 of 3 routes are still running
- **THEN** both processes are terminated, no result is shown, and the panel can start a new simulation

#### Scenario: Cancel while enemy data is being fetched
- **WHEN** the user cancels while the map's enemy-data fetch is running
- **THEN** the panel returns to idle at once, and the fetch keeps running until it ends
