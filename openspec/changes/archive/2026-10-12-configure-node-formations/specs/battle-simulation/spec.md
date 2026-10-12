## ADDED Requirements

### Requirement: Player formation per node
Each simulation SHALL set the player formation at every node with a battle on the simulated part of its route — from the node the fleet is at mid-sortie, else from the first node after the start — to the formation in effect there (see simulator-panel, Node formations). Nodes without a battle SHALL get no formation. A run SHALL use the formations in effect when it starts.

A node's **default** formation SHALL follow the first rule that applies, in this order:
1. **Submarines only**: every enemy composition at the node, in the node's enemy data in the kcnav cache, is a single fleet made only of submarines → 単横陣.
2. **Submarines mixed**: at least one enemy composition at the node has a submarine → 梯形陣.
3. **Night battle**: the node is a night-battle node (most edges into it have color 11 in the map's topology data, as for the Night battle switch) → 梯形陣.
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
