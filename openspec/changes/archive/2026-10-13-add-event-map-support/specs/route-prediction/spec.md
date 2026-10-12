## ADDED Requirements

### Requirement: Event maps
Route prediction, its cache and sortie narrowing SHALL work for event maps as for normal maps. Mid-sortie, an event map sortie SHALL be recognised from poi's record of the sortie like a normal map's. When compass models the map's difficulty, prediction SHALL set it to the run's difficulty (see battle-simulation, Event state per run), and the cache key SHALL include it.

#### Scenario: Sortie on an event map
- **WHEN** the selected fleet is at E on 62-3
- **THEN** the panel is in sortie mode for 62-3, and the candidates are narrowed to the fleet's path as on a normal map

#### Scenario: Difficulty changes the routes
- **WHEN** compass routes 62-3 differently on 丁 than on 甲, and the user changes the event state's difficulty from 甲 to 丁
- **THEN** compass is loaded again with 丁, and the candidates are those for 丁

## MODIFIED Requirements

### Requirement: Player-selected branches and phase
For maps where the player chooses a branch (for example 4-5, 5-3, 5-5, 5-6, 6-3, 7-4, and 7-5, and many event maps) or a map phase (for example 5-6, 7-3, and event maps whose routes open by phase), prediction SHALL use the choices the user set in the panel. Which maps have choices, and each choice's options and default, SHALL come from the map-choices part of the game-data package version in use (see game-data-package); a map it doesn't list has no choices. Each choice is applied to compass as a fixed decision before the routes are read. The returned candidates and their probabilities therefore apply only to those choices. Prediction SHALL fail with an "unexpected page structure" error when compass's set of choosable nodes for the map does not match the plugin's set. It SHALL NOT silently drop a choice or fall back to compass's defaults.

#### Scenario: Choice changes the route
- **WHEN** the user sets 7-5 node F to J instead of G
- **THEN** every candidate passes F→J and none passes F→G

#### Scenario: Phase changes the route
- **WHEN** the user sets 7-3 to phase 2
- **THEN** the candidates are those for phase 2, which differ from phase 1

#### Scenario: Compass changed its choices
- **WHEN** compass lists a choosable node for 7-5 that the plugin does not know about
- **THEN** the prediction fails with an "unexpected page structure" error that names the map and node

#### Scenario: Choices for a new event map
- **WHEN** a package version adds the map choices of a new event's 63-2, with a phase and a branch at F
- **THEN** the panel shows those controls for 63-2, and prediction applies them, without a plugin update

### Requirement: Target reach
The target is Boss or a node letter. Each candidate SHALL be marked as reaching the target or not:
- With the Boss target, a candidate reaches the target when its last node is one of the map's boss nodes, as listed in the optimizer data of the game-data package version in use (see game-data-package). The candidate keeps all its nodes.
- With a node target, a candidate reaches the target when the target letter is among its nodes after the start node. The candidate is cut off right after the target's first occurrence, so the target becomes its last node. Candidates that do not reach the target keep all their nodes.
- Mid-sortie, a target before the node the fleet is at has already been reached: the candidates are cut there as well, and marked as having passed the target. Their battle at the target is over, so they are not simulated (see battle-simulation).

Mid-sortie, the candidates SHALL first be narrowed to the sortie's path so far (see Sortie progress narrows the candidates), and only then marked, cut and merged.

Candidates that reach the target and have the same nodes after the cut SHALL be merged into one candidate. Its probability is the sum of theirs. The probabilities of all candidates SHALL still add up to 1, within a tolerance of 1e-6.

Marking, cutting and merging SHALL NOT require any network request, and SHALL NOT be part of the prediction cache: changing only the target SHALL NOT load compass again.

#### Scenario: Route ending before the boss
- **WHEN** the target is Boss, a 2-5 candidate ends at node D, and the optimizer data in use lists the boss node as O
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
