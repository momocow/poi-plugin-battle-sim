## RENAMED Requirements

- FROM: `### Requirement: Simulate every candidate that reaches the boss`
- TO: `### Requirement: Simulate every candidate that reaches the target`

- FROM: `### Requirement: Rank rates when the boss is reached`
- TO: `### Requirement: Rank rates when the target is reached`

## MODIFIED Requirements

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
