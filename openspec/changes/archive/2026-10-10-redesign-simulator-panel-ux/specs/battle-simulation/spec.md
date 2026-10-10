## MODIFIED Requirements

### Requirement: Weighted aggregate result
The overall result SHALL combine the results of the simulated routes, each weighted by its route probability. Every per-route rate used for weighting SHALL count all of that route's trials, including trials that retreated before the boss. The boss rank rates conditional on reaching the boss SHALL NOT be weighted directly. Routes that miss the boss count as 0 for every boss-related rate.

The overall result SHALL include:
- the probability of each battle rank at the boss (S, A, B, C, D, E);
- the cumulative rank rates **S**, **A or better** (S + A), and **B or better** (S + A + B, a victory);
- the probability of reaching the boss;
- the probability of sinking the boss.

Each route's own result SHALL also stay available, with the same cumulative rank rates over all of that route's trials. The system SHALL NOT report a probability of losing a ship.

#### Scenario: Two routes
- **WHEN** route X (probability 0.6) has an S-rank rate of 0.8 over all its trials, and route Y (probability 0.4) has an S-rank rate of 0.5 over all its trials
- **THEN** the overall S-rank probability is 0.68

#### Scenario: Retreats reduce the overall rates
- **WHEN** a single route has probability 1, reaches the boss in 90% of trials, and gets S rank in 80% of the trials that reach the boss
- **THEN** the overall S-rank probability is 0.72, not 0.8

#### Scenario: Cumulative ranks
- **WHEN** a single route has probability 1 and, over all its trials, S 0.5, A 0.2, B 0.1, C 0.05, and 0.15 of trials do not reach the boss
- **THEN** S is 0.5, A or better is 0.7, and B or better is 0.8

### Requirement: Rank rates when the boss is reached
Alongside the probability-weighted values, the system SHALL provide the rate among trials that reach the boss for each battle rank, for each cumulative rank rate (S, A or better, B or better), and for sinking the boss. It SHALL do this both for each route and overall. The rank rate for a route SHALL be the optimizer's conditional rank rate for that route; its boss-sunk rate SHALL be its boss-sunk rate over all trials divided by its chance of reaching the boss. The overall rate SHALL be the overall probability-weighted rate divided by the overall probability of reaching the boss. It SHALL NOT be a probability-weighted average of the per-route conditional rates. When the probability of reaching the boss is 0, the rate SHALL be reported as undefined, not as 0.

#### Scenario: Overall rate when the boss is reached
- **WHEN** the overall S-rank probability is 0.14 and the overall probability of reaching the boss is 0.28
- **THEN** the overall S rate when the boss is reached is 0.5

#### Scenario: Different retreat rates between routes
- **WHEN** route X (probability 0.5) reaches the boss in 100% of trials with an S rate of 0.8 there, and route Y (probability 0.5) reaches the boss in 50% of trials with an S rate of 0.4 there
- **THEN** the overall S rate when the boss is reached is (0.4 + 0.1) / 0.75 ≈ 0.667, not the simple average 0.6

#### Scenario: Boss never reached
- **WHEN** no trial on any simulated route reaches the boss
- **THEN** the rates when the boss is reached are undefined, and the panel shows them as "—"

## ADDED Requirements

### Requirement: Reach rate per node
For each simulated route, the system SHALL provide the share of trials that reach each node of the route, in route order, including nodes without a battle (resource and empty nodes). The source is two parts of the optimizer result:
- its per-node reach rates, which have one value per battle node;
- its route description, which gives one entry per route node and says which battle value belongs to it, if any.

A node with a battle value takes that value. A node without one takes the value of the next node that has one, since a fleet can only turn back after a battle. The rate for the route's last node SHALL equal the route's chance of reaching the boss.

The retreat rate at a node SHALL be that node's reach rate minus the next node's reach rate. This is the share of trials that turned back after that node, so it is 0 for nodes without a battle.

The result SHALL count as a failure, with a message that the optimizer version is incompatible, when any of these holds:
- the per-node reach rates or the route description are missing;
- the route description does not have one entry per route node;
- an entry points at a battle value that does not exist.

#### Scenario: Retreats on 5-2
- **WHEN** the route `B-C-E-F-O` has a battle at every node, and battle reach rates 1.0, 0.893, 0.86, 0.713, 0.59
- **THEN** the retreat rates are B 10.7%, C 3.3%, E 14.7%, F 12.3%, and the chance of reaching the boss is 59.0%

#### Scenario: Route through an empty node on 2-3
- **WHEN** the route `B-E-F-J-N` has an empty node at B and battles at E, F, J and N, with battle reach rates 1.0, 0.9, 0.8, 0.7
- **THEN** the reach rates are B 100%, E 100%, F 90%, J 80%, N 70%; the retreat rates are E 10.0%, F 10.0%, J 10.0%; and B has no retreat

#### Scenario: Missing per-node rates
- **WHEN** the optimizer's `result` line has no per-node reach rates or no route description
- **THEN** the route fails with an incompatible optimizer version error
