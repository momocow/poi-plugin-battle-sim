## ADDED Requirements

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

## MODIFIED Requirements

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
