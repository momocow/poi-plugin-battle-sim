## ADDED Requirements

### Requirement: Land-based air support per node
Each simulation SHALL send the optimizer the land-base waves that reach the battle nodes on the simulated part of its route: from the node the fleet is at mid-sortie, else from the first node after the start. The waves come from the land-base assignment in effect for the run (see simulator-panel, Land bases, and Mid-sortie land-base assignment). A run SHALL use the assignment in effect when it starts.

A base sends waves only when, in the run's snapshot (see fleet-capture, Snapshot the land bases of the map's area), its action is Attack and it has at least one squadron. Each such base sends two waves, one to each of its two targets. Both waves may go to the same node. A wave whose target is not a battle node on the simulated part of the route SHALL NOT be sent. At a node that gets waves from several bases, the waves SHALL arrive in base number order, and a base's first wave before its second.

A base that sends no wave on the simulated part of the route SHALL NOT be sent to the optimizer. When no wave is sent, the simulation SHALL run exactly as without land bases.

Each base sent SHALL carry its captured squadrons, so planes missing from a squadron, its proficiency and its improvement count, along with its range (see Land-base range check).

#### Scenario: Two waves at the boss
- **WHEN** a route on 6-4 is A-C-E-H-N with the boss N, and base 1 (Attack) has the targets N and N
- **THEN** the simulation sends base 1 with two waves at N and none at the other nodes

#### Scenario: Waves split between nodes
- **WHEN** base 1 targets H and N, and base 2 targets N and N
- **THEN** H gets base 1's first wave. N gets, in order, base 1's second wave, then base 2's first and second waves

#### Scenario: Target off the route
- **WHEN** base 1 targets M and N, and the simulated route doesn't pass M
- **THEN** only base 1's wave at N is sent

#### Scenario: Base not in Attack
- **WHEN** base 2 has targets set in the panel, but its action in game is Air defense
- **THEN** base 2 sends no wave

#### Scenario: No land bases
- **WHEN** the map's area has no bases, or no base in Attack has a target on the route
- **THEN** the simulation's input has no land bases, and its results are as before this change

### Requirement: Land-base range check
Each base sent SHALL carry its captured range. For each battle node on the simulated part of the route, the simulation SHALL send that node's distance when it is known. Distances come from the `nodeDistances` part of the game-data package version the run started with (see game-data-package), except as Mid-sortie land-base assignment says. A map or node that the part doesn't list has an unknown distance. A node with an unknown distance SHALL get no distance, and the optimizer then treats every base as able to reach it. The optimizer applies the check: a wave sent to a node beyond the base's range does not fly. The plugin SHALL NOT drop such a wave itself.

#### Scenario: Node in range
- **WHEN** base 1 has range 9, targets 6-4's N, and the game-data package in use gives N a distance of 6
- **THEN** the simulation sends N's distance 6 with base 1's range 9, and base 1's waves reach N

#### Scenario: Node out of range
- **WHEN** base 1 has range 5, its remembered target is N, and N's distance is 6
- **THEN** the simulation sends both values, and the optimizer has base 1's waves at N not fly

#### Scenario: Unknown distance
- **WHEN** the game-data package in use has no node distances for the map
- **THEN** no node distance is sent, and every wave reaches its node

### Requirement: Mid-sortie land-base assignment
The system SHALL record, for the sortie in progress, the targets the player sent each base to when the sortie started, and the node distances the game sent at sortie start. A mid-sortie run (see Mid-sortie runs simulate the rest of the route) whose sortie was observed from its start SHALL use these instead of the panel's assignment and the game-data package's distances:
- each base the player sent keeps the two targets sent in game, and no other base sends waves. When no base was sent, no wave is sent;
- a node's distance is the one the game sent, when it sent one, else the game-data package's.

When the sortie was not observed from its start, the run SHALL use the panel's assignment for the sortie's map and the game-data package's distances. The result already says that the earlier battles were not observed. The record SHALL be cleared on returning to port.

A wave the game sent to a node the fleet has passed SHALL NOT be sent, since only the rest of the route is simulated.

#### Scenario: Assignment from the game
- **WHEN** the player sent base 1 to H and N and base 2 to N and N when sortieing to 6-4, the panel's assignment for 6-4 is different, and a run is made with the fleet at E
- **THEN** the simulation sends base 1's wave at H, then base 1's second wave and base 2's two waves at N

#### Scenario: Passed target
- **WHEN** the player sent base 1 to C and N, and a run is made with the fleet at E after passing C
- **THEN** only base 1's wave at N is sent

#### Scenario: No base sent
- **WHEN** the player sortied to 6-4 without sending any base, and the panel has targets for 6-4
- **THEN** a mid-sortie run sends no land base

#### Scenario: Distances from the game
- **WHEN** the game's sortie start gave 6-4's N a distance of 6, and the game-data package in use doesn't list 6-4
- **THEN** a mid-sortie run sends N's distance as 6

#### Scenario: Sortie not observed from its start
- **WHEN** the plugin was turned off and on while the fleet was at sea on 6-4, and a run is made with the fleet at E
- **THEN** the simulation uses the panel's assignment for 6-4 and the game-data package's distances
