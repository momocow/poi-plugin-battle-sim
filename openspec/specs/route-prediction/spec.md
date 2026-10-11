# route-prediction Specification

## Purpose

Works out which routes a fleet can take on the chosen map and how likely each one is, so the simulator runs the routes the fleet would actually sail.

## Requirements

### Requirement: Route candidates carry probabilities
Route prediction SHALL return a list of candidates. Each candidate SHALL contain the node letters from the start node to the last node, and a probability between 0 and 1. The probabilities SHALL add up to 1, within a tolerance of 1e-6.

#### Scenario: Map with probabilistic branches
- **WHEN** the map branches by chance for the given fleet (for example 2-5 has three outcomes)
- **THEN** one candidate is returned for each outcome, each with its probability, and the probabilities add up to 1

### Requirement: Compass is the only predictor
The system SHALL predict routes only with the compass route simulator. It SHALL load the fleet's deck-builder document and the chosen map, then read the predicted routes and their probabilities. Compass SHALL run in a browser session that is isolated from poi's game view and from the user's other browsing data. The system SHALL NOT query any other routing service, such as kcnav, to predict routes.

#### Scenario: Compass succeeds
- **WHEN** compass loads and returns at least one route within the timeout
- **THEN** those routes are the candidates

#### Scenario: Compass state is isolated
- **WHEN** a prediction runs
- **THEN** cookies and storage in poi's game view are not read or changed

### Requirement: Prediction failure is an error
If compass fails, the prediction SHALL fail with an error that names the cause, and no simulation SHALL run. Failure means the page cannot be loaded, the page's internal state cannot be found or has an unexpected shape, or no route arrives within 20 seconds. The causes SHALL be distinguished as: page unreachable, unexpected page structure, map not supported by compass, or timeout. The system SHALL NOT retry automatically.

#### Scenario: Compass page changed
- **WHEN** the compass page loads but its route state is missing
- **THEN** the prediction fails with an "unexpected page structure" error, and no request is sent to any other service

#### Scenario: Offline
- **WHEN** the compass page cannot be loaded
- **THEN** the prediction fails with a "page unreachable" error, and the user can retry by hand

### Requirement: Player-selected branches and phase
For maps where the player chooses a branch (for example 4-5, 5-3, 5-5, 5-6, 6-3, 7-4, and 7-5) or a map phase (for example 5-6 and 7-3), prediction SHALL use the choices the user set in the panel. Each choice is applied to compass as a fixed decision before the routes are read. The returned candidates and their probabilities therefore apply only to those choices. Prediction SHALL fail with an "unexpected page structure" error when compass's set of choosable nodes for the map does not match the plugin's set. It SHALL NOT silently drop a choice or fall back to compass's defaults.

#### Scenario: Choice changes the route
- **WHEN** the user sets 7-5 node F to J instead of G
- **THEN** every candidate passes F→J and none passes F→G

#### Scenario: Phase changes the route
- **WHEN** the user sets 7-3 to phase 2
- **THEN** the candidates are those for phase 2, which differ from phase 1

#### Scenario: Compass changed its choices
- **WHEN** compass lists a choosable node for 7-5 that the plugin does not know about
- **THEN** the prediction fails with an "unexpected page structure" error that names the map and node

### Requirement: Target reach
The target is Boss or a node letter. Each candidate SHALL be marked as reaching the target or not:
- With the Boss target, a candidate reaches the target when its last node is one of the map's boss nodes, as listed in the optimizer's bundled map data. The candidate keeps all its nodes.
- With a node target, a candidate reaches the target when the target letter is among its nodes after the start node. The candidate is cut off right after the target's first occurrence, so the target becomes its last node. Candidates that do not reach the target keep all their nodes.
- Mid-sortie, a target before the node the fleet is at has already been reached: the candidates are cut there as well, and marked as having passed the target. Their battle at the target is over, so they are not simulated (see battle-simulation).

Mid-sortie, the candidates SHALL first be narrowed to the sortie's path so far (see Sortie progress narrows the candidates), and only then marked, cut and merged.

Candidates that reach the target and have the same nodes after the cut SHALL be merged into one candidate. Its probability is the sum of theirs. The probabilities of all candidates SHALL still add up to 1, within a tolerance of 1e-6.

Marking, cutting and merging SHALL NOT require any network request, and SHALL NOT be part of the prediction cache: changing only the target SHALL NOT load compass again.

#### Scenario: Route ending before the boss
- **WHEN** the target is Boss, a 2-5 candidate ends at node D, and the bundled data lists the boss node as O
- **THEN** that candidate is marked as not reaching the target

#### Scenario: Node target cuts and merges routes
- **WHEN** the target on 2-5 is E, and compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28
- **THEN** the candidates are `1-C-E` at 0.7, which reaches the target, and `1-C-D` at 0.3, which does not

#### Scenario: Target off every route
- **WHEN** the target is a letter that no predicted candidate passes
- **THEN** every candidate is marked as not reaching the target, and none is cut

#### Scenario: Target change reuses the prediction
- **WHEN** the user runs a fleet on 2-5 with the Boss target, then changes only the target to E and runs again in the same poi session
- **THEN** the second run does not load compass

#### Scenario: Node target mid-sortie
- **WHEN** the target on 2-5 is L, compass predicts the same three routes, and the fleet is at E after passing C
- **THEN** the candidates are narrowed first and then cut, giving `1-C-E-G-L` at 1.0, which reaches the target

#### Scenario: Fleet at the target
- **WHEN** the target on 2-5 is E and the fleet is at E after passing C
- **THEN** the candidate is `1-C-E` at 1.0, which reaches the target

#### Scenario: Target already passed
- **WHEN** the target on 2-5 is E and the fleet is at G after passing C and E
- **THEN** the candidates are cut at E and merge into `1-C-E` at 1.0, which has passed the target

### Requirement: Cache predictions
Predictions SHALL be cached for the current poi session, keyed by map, branch and phase choices, fleet composition, and the equipment that affects routing. Repeating a simulation with the same inputs SHALL NOT load compass again. Failed predictions SHALL NOT be cached.

#### Scenario: Re-run with the same fleet
- **WHEN** the user runs the same fleet on the same map twice in one poi session
- **THEN** the second run does not load compass

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
