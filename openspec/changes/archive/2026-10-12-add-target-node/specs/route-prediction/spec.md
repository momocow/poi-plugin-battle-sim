## RENAMED Requirements

- FROM: `### Requirement: Boss reach is determined from bundled map data`
- TO: `### Requirement: Target reach`

## MODIFIED Requirements

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
