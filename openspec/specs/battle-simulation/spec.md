# battle-simulation Specification

## Purpose

Runs the optimizer's Monte Carlo battle simulation for each route the fleet can take and combines the results by route probability into one outcome for the fleet on that map.

## Requirements

### Requirement: Simulate every candidate that reaches the boss
For each route candidate whose last node is the map's boss node, the system SHALL run one optimizer `simulate` with the fleet snapshot, the map, and that route. Candidates that end before the boss SHALL NOT be simulated, and they count as "boss not reached".

#### Scenario: Route that misses the boss
- **WHEN** the candidates on 2-5 are `1-C-D` at 0.3 and two boss routes at 0.42 and 0.28
- **THEN** two simulations run, and 0.3 is reported as the probability of not reaching the boss

### Requirement: Optimizer runs as a separate process with a machine-readable contract
The optimizer SHALL be started as a child process. Its configuration SHALL be passed on stdin. Its output SHALL be read as one JSON object per line. A run succeeds only if exactly one terminal `result` line arrives and the process exits with code 0. An `error` line, any other exit code, or a missing terminal line SHALL count as a failure. The failure message SHALL come from the `error` line, or from stderr when no `error` line was emitted. Text on stderr SHALL NOT by itself count as failure. Lines whose `schema` value the plugin does not support SHALL count as failure, with a message that the optimizer version is incompatible.

#### Scenario: Usage error
- **WHEN** the optimizer exits with code 2 and prints no JSON
- **THEN** the run fails and the panel shows the optimizer's stderr text

#### Scenario: Warnings on stderr
- **WHEN** the optimizer writes warnings to stderr and then emits a `result` line and exits 0
- **THEN** the run succeeds

### Requirement: Weighted aggregate result
The overall result SHALL combine the results of the simulated routes, each weighted by its route probability. Every per-route rate used for weighting SHALL count all of that route's trials, including trials that retreated before the boss. The boss rank rates conditional on reaching the boss SHALL NOT be weighted directly. Routes that miss the boss count as 0 for every boss-related rate. The overall result SHALL include the probability of each battle rank at the boss (S, A, B, C, D, E), the probability of reaching the boss, and the probability of sinking the boss. The probability of losing at least one ship SHALL be shown only over the simulated routes, and SHALL be labeled that way. Each route's own result SHALL also stay available.

#### Scenario: Two routes
- **WHEN** route X (probability 0.6) has an S-rank rate of 0.8 over all its trials, and route Y (probability 0.4) has an S-rank rate of 0.5 over all its trials
- **THEN** the overall S-rank probability is 0.68

#### Scenario: Retreats reduce the overall rates
- **WHEN** a single route has probability 1, reaches the boss in 90% of trials, and gets S rank in 80% of the trials that reach the boss
- **THEN** the overall S-rank probability is 0.72, not 0.8

### Requirement: Rank rates when the boss is reached
Alongside the probability-weighted values, the system SHALL provide each battle rank's rate among trials that reach the boss, both for each route and overall. The rate for a route SHALL be the optimizer's conditional rank rate for that route. The overall rate SHALL be the overall probability-weighted rank rate divided by the overall probability of reaching the boss. It SHALL NOT be a probability-weighted average of the per-route conditional rates. When the probability of reaching the boss is 0, the rate SHALL be reported as undefined, not as 0.

#### Scenario: Overall rate when the boss is reached
- **WHEN** the overall S-rank probability is 0.14 and the overall probability of reaching the boss is 0.28
- **THEN** the overall S rate when the boss is reached is 0.5

#### Scenario: Different retreat rates between routes
- **WHEN** route X (probability 0.5) reaches the boss in 100% of trials with an S rate of 0.8 there, and route Y (probability 0.5) reaches the boss in 50% of trials with an S rate of 0.4 there
- **THEN** the overall S rate when the boss is reached is (0.4 + 0.1) / 0.75 ≈ 0.667, not the simple average 0.6

#### Scenario: Boss never reached
- **WHEN** no trial on any simulated route reaches the boss
- **THEN** the rates when the boss is reached are undefined, and the panel shows them as "—"

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
The user SHALL be able to cancel a running simulation. Cancelling SHALL stop every optimizer process started for it and discard any partial results.

#### Scenario: Cancel mid-run
- **WHEN** the user cancels while 2 of 3 routes are still running
- **THEN** both processes are terminated, no result is shown, and the panel can start a new simulation
