## ADDED Requirements

### Requirement: Routes for combined fleets
For a combined snapshot, compass SHALL be given both fleets and the combined type, and the candidates SHALL be the routes compass predicts for that combined fleet. If compass reports a fleet type different from the one requested after loading, the prediction SHALL fail with an "unexpected page structure" error, rather than returning routes for the wrong type. The cache key SHALL include the combined type and both fleets' compositions.

#### Scenario: Combined fleet on 6-4
- **WHEN** a Surface Task Force is simulated on a map where compass supports combined fleets
- **THEN** the candidates are compass's routes for that Surface Task Force

#### Scenario: Wrong fleet type in compass
- **WHEN** compass reads the document as a single fleet instead of a Surface Task Force
- **THEN** the prediction fails with an "unexpected page structure" error that names the expected and actual fleet type

#### Scenario: Type is part of the cache key
- **WHEN** the same 12 ships are simulated on the same map, first as a Carrier Task Force and then as a Surface Task Force
- **THEN** the second run loads compass again
