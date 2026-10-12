## MODIFIED Requirements

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

## ADDED Requirements

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
