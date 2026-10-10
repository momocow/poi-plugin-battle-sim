## ADDED Requirements

### Requirement: Simulate combined fleets
For a combined snapshot, each optimizer run SHALL be given the main fleet, the escort fleet, and the combined type. The per-route and overall results SHALL have the same meaning as for a single fleet. "Lost a ship" SHALL cover ships in both fleets.

#### Scenario: Escort ship sunk
- **WHEN** in some trials only an escort ship is sunk
- **THEN** those trials count toward "lost a ship"
