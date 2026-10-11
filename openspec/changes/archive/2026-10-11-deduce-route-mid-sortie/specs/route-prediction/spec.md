## ADDED Requirements

### Requirement: Sortie progress narrows the candidates
While the fleet being simulated is on a sortie, route prediction SHALL keep only the candidates whose nodes start with the nodes the fleet has visited so far, from the start node through the node it is at. It SHALL scale the kept candidates' probabilities by the same factor so that they add up to 1, within a tolerance of 1e-6. The visited nodes SHALL be read from poi's record of the sortie and turned into node letters with the map's topology data, without any request beyond the map's shared enemy-data fetch.

When no candidate starts with the visited nodes, the prediction SHALL fail with an error that names the map and the visited nodes. It SHALL NOT fall back to the unnarrowed candidates. When the visited nodes cannot be turned into letters, the prediction SHALL fail with an error that says the map's data could not be read.

For a player-selected branch whose node the fleet has passed, prediction SHALL use the branch taken, whatever choice is set for the map.

The cache of predictions SHALL be unaffected: narrowing applies to the cached candidates, so advancing a node does not load compass again.

#### Scenario: Branch already taken on 2-5
- **WHEN** compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the fleet is at E after passing C
- **THEN** the candidates are `1-C-E-G-L-N` at 0.6 and `1-C-E-G-L-O` at 0.4

#### Scenario: At the boss
- **WHEN** the fleet is at the boss node of a route that compass predicted
- **THEN** that route is the only candidate, at probability 1

#### Scenario: Branch taken overrides the choice
- **WHEN** the fleet passed F→G on 7-5 but the choice set for F is J
- **THEN** the prediction uses F→G, and the candidates pass F→G

#### Scenario: Path not predicted
- **WHEN** compass predicts no route through the nodes the fleet has visited
- **THEN** the prediction fails with an error naming the map and the visited nodes

#### Scenario: Advancing reuses compass
- **WHEN** the fleet advances from C to E on a map already predicted for the same fleet and choices
- **THEN** compass is not loaded again
