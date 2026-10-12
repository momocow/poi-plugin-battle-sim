# battle-simulation Specification

## Purpose

Runs the optimizer's Monte Carlo battle simulation for each route the fleet can take and combines the results by route probability into one outcome for the fleet on that map.

## Requirements

### Requirement: Simulate every candidate that reaches the target
For each route candidate that reaches the target (see route-prediction), the system SHALL run one optimizer `simulate` with the fleet snapshot, the map, and that candidate's nodes. The last node is the target. Candidates that do not reach the target SHALL NOT be simulated, and they count as "target not reached". Mid-sortie, a candidate that has passed the target (see route-prediction) SHALL NOT be simulated either: it counts as reaching the target in all its trials, and its rank and flagship-sunk rates are unknown, so the overall rank and flagship-sunk rates are reported as undefined.

Whether the fleet pursues night battle at each node, the target included, SHALL follow the node's night battle setting (see Night battle per node). This applies to the Boss target as well as to a node target.

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
- **WHEN** the target's night battle setting is Never
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

Every simulation SHALL also ask the optimizer for its per-node rank results: for each battle node, the share of each battle rank among the trials that fought there. A battle node where no trial fought has no rank results. For any target other than a node target, missing per-node rank results SHALL NOT fail the route; the affected nodes simply have no rank results.

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

#### Scenario: Per-node ranks with the Boss target
- **WHEN** a route on 5-2 is simulated with the Boss target
- **THEN** the simulation asks for per-node rank results, and the route's result has the rank shares at each battle node where some trials fought

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

### Requirement: Player formation per node
Each simulation SHALL set the player formation at every node with a battle on the simulated part of its route — from the node the fleet is at mid-sortie, else from the first node after the start — to the formation in effect there (see simulator-panel, Node formations). Nodes without a battle SHALL get no formation. A run SHALL use the formations in effect when it starts.

A node's **default** formation SHALL follow the first rule that applies, in this order:
1. **Submarines only**: every enemy composition at the node, in the node's enemy data in the kcnav cache, is a single fleet made only of submarines → 単横陣.
2. **Submarines mixed**: at least one enemy composition at the node has a submarine → 梯形陣.
3. **Night battle**: the node is a night-battle node (most edges into it have color 11 in the map's topology data; see Night battle per node) → 梯形陣.
4. **Air battle**: most edges into the node have color 7 (air battle) or 10 (air raid), counted as for night-battle nodes → 輪形陣.
5. **Normal battle**: any other node → 単縦陣.

A submarine is an enemy ship whose ship type in the game data is submarine or submarine aircraft carrier. When the node's enemy data is not in the kcnav cache, rules 1 and 2 SHALL NOT apply. A run reads the defaults after waiting for the map's shared enemy-data fetch, so a node whose enemy data that fetch writes gets the submarine rules.

The simulation sends the node's formation as chosen. The optimizer then applies the game's ship-count rule (see simulator-panel, Node formations): with fewer than 4 ships the fleet uses 単縦陣, and 輪形陣 with fewer than 5 ships becomes 複縦陣. The plugin SHALL NOT apply the rule a second time.

The defaults are for a single fleet. Formations of a combined fleet are not covered here.

#### Scenario: Air raid node
- **WHEN** a route on 5-2 passes C, an air-raid node, and C has no map formation
- **THEN** its simulation uses 輪形陣 at C

#### Scenario: Air battle node
- **WHEN** a route on 5-2 passes I, an air-battle node, with no formation set
- **THEN** its simulation uses 輪形陣 at I

#### Scenario: Night-battle node
- **WHEN** a route on 5-3 passes P, a night-battle node, with no formation set
- **THEN** its simulation uses 梯形陣 at P

#### Scenario: Submarine node
- **WHEN** every enemy composition in the kcnav cache for 1-5 node A is made only of submarines, and A has no formation set
- **THEN** the simulation uses 単横陣 at A

#### Scenario: Submarines among surface ships
- **WHEN** one of a node's enemy compositions has a submarine and another has none
- **THEN** the simulation uses 梯形陣 there

#### Scenario: Submarines win over night battle
- **WHEN** a night-battle node's enemy compositions are all made only of submarines
- **THEN** the simulation uses 単横陣 there, not 梯形陣

#### Scenario: Normal node
- **WHEN** a node has no submarine in any enemy composition and is neither a night-battle nor an air-battle node
- **THEN** the simulation uses 単縦陣 there

#### Scenario: User formation wins
- **WHEN** 5-2 node C has the map formation 単縦陣
- **THEN** the simulation uses 単縦陣 at C, not its default 輪形陣

#### Scenario: Small fleet at an air raid
- **WHEN** a 4-ship fleet's route on 5-2 passes C, which has no map formation
- **THEN** the config sends 輪形陣 at C, and the optimizer simulates the battle there in 複縦陣

#### Scenario: Passed nodes get none
- **WHEN** the fleet is at E on 2-5 after passing C
- **THEN** the simulation sets formations from E on, and none for C

#### Scenario: Enemy data fetched during the run
- **WHEN** the first run of 1-5 starts before the map's enemy data is in the kcnav cache
- **THEN** the simulations, which wait for the fetch, use 単横陣 at the submarine-only nodes

### Requirement: Night battle per node
Each simulation SHALL tell the optimizer, for every node with a battle on the simulated part of its route, whether the fleet pursues night battle there, from the node's night battle setting (see simulator-panel, Node settings):
- **If target**, the default: night battle only when the node is the run's target;
- **Always**: night battle;
- **Never**: no night battle.

Two kinds of node override the setting, read from the map's topology data as the optimizer reads it (the majority color of the edges into the node):
- a **night-battle node** (color 11) has a night battle only, so the fleet fights one there whatever the setting;
- an **air raid node** (color 10) has no night phase, so no night battle is sent for it.

A run SHALL use the settings in effect when it starts. Before the map's topology data is in the kcnav cache, only the target's night battle SHALL be sent, as If target: night battle at the boss.

#### Scenario: Default at the target only
- **WHEN** a route on 2-5 is C-E-G-L-O with the Boss target O and no node set
- **THEN** the simulation pursues night battle at O and not at C, E or L

#### Scenario: Always before the target
- **WHEN** 2-5's E is set to Always and the target is O
- **THEN** the simulation pursues night battle at E and at O

#### Scenario: Never at the target
- **WHEN** 2-5's O is set to Never and the target is O
- **THEN** the simulation runs without night battle at O

#### Scenario: Night-battle node
- **WHEN** a route on 5-3 passes P, a night-battle node, set to Never
- **THEN** the simulation still fights a night battle at P

#### Scenario: Air raid node
- **WHEN** a route on 5-2 passes C, an air raid node, as its target
- **THEN** no night battle is sent for C

### Requirement: Special attack per node
For each battle node on the simulated part of a simulated route, the system SHALL decide which of the fleet's special attacks (旗艦特攻), if any, can fire there. It SHALL use the optimizer's static trigger conditions for single fleets, applied to the fleet the run simulated:
- the flagship can fire that special: Nelson Touch, 長門 or 陸奥 一斉射, Colorado, the 金剛型 night attack, Richelieu, Warspite, or the Yamato 3-ship or 2-ship attack;
- the node's formation, after the ship-count rule (see Player formation per node), is one that special triggers in;
- the partner ships it needs are in the required positions;
- the fleet has enough surface ships, counting ships that are not submarines: 6 for most specials, 5 for the 金剛型 night attack;
- the 金剛型 night attack only at a node where the run pursues night battle;
- the special has not fired earlier in the sortie, as recorded for a mid-sortie run (see Mid-sortie runs simulate the rest of the route). The 金剛型 night attack is exempt, since it can fire more than once.

Conditions that depend on how a battle goes, such as HP thresholds and ships sunk during the sortie, and whether the special fires at an earlier node of the same simulated route, SHALL NOT be considered. The result says the special *can* fire at the node, not that it will. When a Yamato flagship meets the conditions for both of its attacks, the result SHALL be the 3-ship attack, which the optimizer tries first. A mid-sortie run that did not see the sortie from its start knows of no special fired earlier.

This decision SHALL NOT change what is sent to the optimizer.

#### Scenario: Nelson Touch in double line
- **WHEN** a six-ship fleet with Nelson as flagship and no submarines or carriers in positions 3 and 5 fights at a node in 複縦陣
- **THEN** Nelson Touch can fire at that node

#### Scenario: Wrong formation
- **WHEN** the same fleet fights at a node in 単縦陣
- **THEN** no special attack can fire at that node

#### Scenario: Already fired mid-sortie
- **WHEN** a mid-sortie run that saw the sortie from its start has recorded Nelson Touch firing at an earlier node
- **THEN** no special attack can fire at any node of the rest of the route

#### Scenario: Kongou night attack needs night battle
- **WHEN** a fleet with 金剛改二丙 as flagship and a valid partner second fights at a node in 単縦陣, and the run does not pursue night battle there
- **THEN** no special attack can fire at that node; at a node where the run does pursue night battle, the 金剛型 night attack can fire

#### Scenario: Too few ships after the ship-count rule
- **WHEN** a fleet of 3 ships with Nelson as flagship is set to 複縦陣 at a node
- **THEN** no special attack can fire there, since the fleet fights in 単縦陣 with too few surface ships

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
