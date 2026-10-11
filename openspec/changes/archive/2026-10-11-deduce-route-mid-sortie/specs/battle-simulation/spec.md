## ADDED Requirements

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
