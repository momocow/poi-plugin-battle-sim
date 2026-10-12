# battle-simulation Specification

## Purpose

Runs the optimizer's Monte Carlo battle simulation for each route the fleet can take and combines the results by route probability into one outcome for the fleet on that map.

## Requirements

### Requirement: Simulate every candidate that reaches the target
For each route candidate that reaches the target (see route-prediction), the system SHALL run one optimizer `simulate` with the fleet snapshot, the map, and that candidate's nodes. The last node is the target. Candidates that do not reach the target SHALL NOT be simulated, and they count as "target not reached". Mid-sortie, a candidate that has passed the target (see route-prediction) SHALL NOT be simulated either: it counts as reaching the target in all its trials, and its rank and flagship-sunk rates are unknown, so the overall rank and flagship-sunk rates are reported as undefined.

The fleet SHALL pursue night battle at the target node when the Night battle switch is on, and SHALL NOT when it is off. This applies to the Boss target as well as to a node target. A night-battle node is the exception: its battle is a night battle only, so the switch has no effect there.

With a node target, the target node SHALL have a battle, as read from the map's topology data (see simulator-panel, Inputs). When it has none (for example a remembered target on a map whose data has changed), the run SHALL fail before any simulation with an error that names the node and says to pick a battle node.

#### Scenario: Route that misses the boss
- **WHEN** the target is Boss, and the candidates on 2-5 are `1-C-D` at 0.3 and two boss routes at 0.42 and 0.28
- **THEN** two simulations run, and 0.3 is reported as the probability of not reaching the target

#### Scenario: Node target
- **WHEN** the target on 2-5 is E and the candidates after the cut are `1-C-E` at 0.7 and `1-C-D` at 0.3
- **THEN** one simulation runs, for the route C-E, and it stops after the battle at E

#### Scenario: Target already passed
- **WHEN** the target on 2-5 is E and the fleet is at G after passing E
- **THEN** no simulation runs; the chance of reaching the target is 1, and the rank and flagship-sunk rates are undefined

#### Scenario: Night battle off
- **WHEN** the Night battle switch is off
- **THEN** each simulation runs without night battle at the target node

#### Scenario: Target without a battle
- **WHEN** the target is a node where the fleet only gets resources
- **THEN** the run fails before any simulation with an error that names the node and asks for a battle node

### Requirement: Optimizer runs as a separate process with a machine-readable contract
The optimizer SHALL be started as a child process. Its configuration SHALL be passed on stdin. Its output SHALL be read as one JSON object per line. A run succeeds only if exactly one terminal `result` line arrives and the process exits with code 0. An `error` line, any other exit code, or a missing terminal line SHALL count as a failure. The failure message SHALL come from the `error` line, or from stderr when no `error` line was emitted. Text on stderr SHALL NOT by itself count as failure. Lines whose `schema` value the plugin does not support SHALL count as failure, with a message that the optimizer version is incompatible.

#### Scenario: Usage error
- **WHEN** the optimizer exits with code 2 and prints no JSON
- **THEN** the run fails and the panel shows the optimizer's stderr text

#### Scenario: Warnings on stderr
- **WHEN** the optimizer writes warnings to stderr and then emits a `result` line and exits 0
- **THEN** the run succeeds

### Requirement: Start from current supply and planes
Each simulation SHALL start every ship with its captured current HP, fuel, ammo, and planes in each main slot, in every trial. A value at its maximum SHALL be treated as full. The plane counts SHALL cover the main slots the ship has, in slot order, and not the expansion slot.

#### Scenario: Unresupplied fleet
- **WHEN** the flagship has 12 of 40 ammo and lost 9 planes in its second slot
- **THEN** every trial starts the flagship at 12 ammo with 9 planes in that slot

#### Scenario: Resupplied fleet
- **WHEN** every ship has full fuel, ammo and planes
- **THEN** the simulation runs as with a fully supplied fleet

### Requirement: Mid-sortie runs simulate the rest of the route
While the fleet being simulated is on a sortie, each simulated candidate SHALL be simulated from the node the fleet is at through the candidate's last node, with the fleet's current HP. Nodes before it SHALL NOT be simulated. Which candidates are simulated, and how the results are weighted, SHALL follow the same rules as for a whole route, using the narrowed probabilities. The per-node reach rates SHALL cover the simulated nodes only, starting at 100% for the node the fleet is at.

Each ship SHALL start at that node with its current HP, fuel, ammo and planes (see Start from current supply and planes). Every special attack that the fleet's ships fired earlier in the sortie SHALL be passed to the optimizer, one entry per firing, so the once-per-sortie rules apply to the rest of the route. Special attacks fired by the enemy SHALL NOT be passed. When the sortie's earlier battles were not observed from its start, no special attacks SHALL be passed, and the result SHALL say so.

#### Scenario: At E on 2-5
- **WHEN** the fleet is at E on 2-5 after passing C, and the narrowed candidates are `1-C-E-G-L-N` at 0.6 and `1-C-E-G-L-O` at 0.4 with O the boss
- **THEN** one simulation runs, for the nodes E, G, L and O, with the fleet's current HP, and 0.6 is reported as the probability of not reaching the boss

#### Scenario: Nelson Touch already fired
- **WHEN** the fleet's Nelson fired a Nelson Touch at C, and a run is made with the fleet at E
- **THEN** the simulation is told that a Nelson Touch fired, and no special attack fires in the rest of the route

#### Scenario: Sortie not observed from its start
- **WHEN** the plugin was turned off and on in poi's plugin settings while the fleet was at sea, and a run is made with the fleet at E
- **THEN** no special attacks are passed, and the result says the earlier battles were not observed

#### Scenario: Damage carried in
- **WHEN** the flagship is at 10 of 40 HP when the fleet reaches E
- **THEN** the simulation starts the flagship at 10 HP at E

### Requirement: Weighted aggregate result
The overall result SHALL combine the results of the simulated routes, each weighted by its route probability. Every per-route rate used for weighting SHALL count all of that route's trials, including trials that retreated before the target. The rank rates conditional on reaching the target SHALL NOT be weighted directly. Routes that do not reach the target count as 0 for every target-related rate.

The overall result SHALL include:
- the probability of each battle rank at the target (S, A, B, C, D, E);
- the cumulative rank rates **S**, **A or better** (S + A), and **B or better** (S + A + B, a victory);
- the probability of reaching the target;
- the probability of sinking the enemy flagship at the target. With the Boss target, this is the probability of sinking the boss.

Each route's own result SHALL also stay available, with the same cumulative rank rates over all of that route's trials. The system SHALL NOT report a probability of losing a ship.

For a node target, a route's rates over all its trials SHALL be derived from the optimizer's per-node results for the target node: the reach rate is the share of trials that fought there; each rank rate and the flagship-sunk rate are that node's rate among the trials that fought there, times the reach rate.

#### Scenario: Two routes
- **WHEN** route X (probability 0.6) has an S-rank rate of 0.8 over all its trials, and route Y (probability 0.4) has an S-rank rate of 0.5 over all its trials
- **THEN** the overall S-rank probability is 0.68

#### Scenario: Retreats reduce the overall rates
- **WHEN** a single route has probability 1, reaches the target in 90% of trials, and gets S rank in 80% of the trials that reach the target
- **THEN** the overall S-rank probability is 0.72, not 0.8

#### Scenario: Cumulative ranks
- **WHEN** a single route has probability 1 and, over all its trials, S 0.5, A 0.2, B 0.1, C 0.05, and 0.15 of trials do not reach the target
- **THEN** S is 0.5, A or better is 0.7, and B or better is 0.8

#### Scenario: Node target from per-node results
- **WHEN** the target is E, the optimizer reports that 0.9 of the trials fought at E, with S in 0.6 and the flagship sunk in 0.5 of those
- **THEN** the route's S rate over all trials is 0.54, its flagship-sunk rate over all trials is 0.45, and its reach rate is 0.9

### Requirement: Rank rates when the target is reached
Alongside the probability-weighted values, the system SHALL provide the rate among trials that reach the target for each battle rank, for each cumulative rank rate (S, A or better, B or better), and for sinking the enemy flagship at the target. It SHALL do this both for each route and overall. The rank rate for a route SHALL be the optimizer's conditional rank rate at the target for that route; its flagship-sunk rate SHALL be its flagship-sunk rate over all trials divided by its chance of reaching the target. The overall rate SHALL be the overall probability-weighted rate divided by the overall probability of reaching the target. It SHALL NOT be a probability-weighted average of the per-route conditional rates. When the probability of reaching the target is 0, the rate SHALL be reported as undefined, not as 0.

#### Scenario: Overall rate when the boss is reached
- **WHEN** the overall S-rank probability is 0.14 and the overall probability of reaching the target is 0.28
- **THEN** the overall S rate when the target is reached is 0.5

#### Scenario: Different retreat rates between routes
- **WHEN** route X (probability 0.5) reaches the target in 100% of trials with an S rate of 0.8 there, and route Y (probability 0.5) reaches the target in 50% of trials with an S rate of 0.4 there
- **THEN** the overall S rate when the target is reached is (0.4 + 0.1) / 0.75 ≈ 0.667, not the simple average 0.6

#### Scenario: Boss never reached
- **WHEN** no trial on any simulated route reaches the target
- **THEN** the rates when the target is reached are undefined, and the panel shows them as "—"

### Requirement: Reach rate per node
For each simulated route, the system SHALL provide the share of trials that reach each node of the route, in route order, including nodes without a battle (resource and empty nodes). The source is two parts of the optimizer result:
- its per-node reach rates, which have one value per battle node;
- its route description, which gives one entry per route node and says which battle value belongs to it, if any.

A node with a battle value takes that value. A node without one takes the value of the next node that has one, since a fleet can only turn back after a battle. The rate for the route's last node SHALL equal the route's chance of reaching the target.

The retreat rate at a node SHALL be that node's reach rate minus the next node's reach rate. This is the share of trials that turned back after that node, so it is 0 for nodes without a battle.

The result SHALL count as a failure, with a message that the optimizer version is incompatible, when any of these holds:
- the per-node reach rates or the route description are missing;
- the route description does not have one entry per route node;
- an entry points at a battle value that does not exist;
- for a node target, the per-node rank or flagship-sunk results are missing for the target node.

#### Scenario: Retreats on 5-2
- **WHEN** the route `B-C-E-F-O` has a battle at every node, and battle reach rates 1.0, 0.893, 0.86, 0.713, 0.59
- **THEN** the retreat rates are B 10.7%, C 3.3%, E 14.7%, F 12.3%, and the chance of reaching the target O is 59.0%

#### Scenario: Route through an empty node on 2-3
- **WHEN** the route `B-E-F-J-N` has an empty node at B and battles at E, F, J and N, with battle reach rates 1.0, 0.9, 0.8, 0.7
- **THEN** the reach rates are B 100%, E 100%, F 90%, J 80%, N 70%; the retreat rates are E 10.0%, F 10.0%, J 10.0%; and B has no retreat

#### Scenario: Missing per-node rates
- **WHEN** the optimizer's `result` line has no per-node reach rates or no route description
- **THEN** the route fails with an incompatible optimizer version error

### Requirement: Optimizer binary resolution and integrity
The system SHALL use the optimizer binary for the current platform at the version pinned in the package. Before first use it SHALL verify the binary's SHA-256 checksum. On a checksum mismatch or a missing binary, it SHALL refuse to run and say why. The plugin's settings page in poi SHALL let the user set a local optimizer binary and, optionally, its data directory for development; these are stored in poi's config. When no binary is set there, the `BATTLE_SIM_OPTIMIZER_BIN` and `BATTLE_SIM_OPTIMIZER_DATA` environment variables MAY supply them. Both paths SHALL come from the same source: a binary from config is never paired with a data directory from the environment. When a development binary is in use, the checksum check is skipped and the panel shows that a development binary is in use. A change to these settings takes effect from the next run.

#### Scenario: Corrupted binary
- **WHEN** the bundled binary's checksum does not match the pinned value
- **THEN** no simulation runs and the panel reports an integrity error

#### Scenario: Development binary set in settings
- **WHEN** the user enters a local binary path on the plugin's settings page and starts a simulation
- **THEN** that binary runs without a checksum check, and the panel shows that a development binary is in use

### Requirement: Writable state lives in poi's app data
The optimizer's working directory, kcnav cache, and log files SHALL be inside poi's app data directory for this plugin. The plugin's install directory and the bundled game data SHALL NOT be written to.

#### Scenario: First run of a map
- **WHEN** a map is simulated for the first time and the optimizer fetches that map's topology and enemy data
- **THEN** the fetched files are written under the plugin's app data directory

### Requirement: Cancel
The user SHALL be able to cancel a running simulation. Cancelling SHALL stop every simulation process started for it and discard any partial results. The shared enemy-data fetch for the map SHALL NOT be stopped.

#### Scenario: Cancel mid-run
- **WHEN** the user cancels while 2 of 3 routes are still running
- **THEN** both processes are terminated, no result is shown, and the panel can start a new simulation

#### Scenario: Cancel while enemy data is being fetched
- **WHEN** the user cancels while the map's enemy-data fetch is running
- **THEN** the panel returns to idle at once, and the fetch keeps running until it ends

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
