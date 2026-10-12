## ADDED Requirements

### Requirement: Snapshot the land bases of the map's area
When a run starts, the system SHALL also read, from poi's state at that moment, the land bases of the selected map's area. The area is the map's world number, for example 6 for 6-4. The bases SHALL be in base number order. For every base it SHALL capture:
- its base number and name;
- its action: Standby (待機), Attack (出撃), Air defense (防空), Retreat (退避) or Rest (休息);
- its range: the base range plus the bonus range, as the game shows it;
- its squadrons in squadron order. Each squadron has the plane's equipment master ID, improvement level, aircraft proficiency, and current and maximum plane count.

A squadron with no plane, or one whose plane is being relocated (配置転換中), SHALL be left out. The other squadrons keep their order. When poi's state has no bases for the area, the snapshot SHALL have none. That is not an error.

The land bases SHALL NOT be part of the compass input, since they don't affect routing.

#### Scenario: Two bases on 6-4
- **WHEN** a run starts on 6-4, and poi's state has two area-6 bases: base 1 in Attack, range 7 + 2, with four squadrons, and base 2 in Air defense
- **THEN** the snapshot has both bases in order. Base 1 has the action Attack, range 9, and its four squadrons with their plane IDs, improvement, proficiency and plane counts. Base 2 has the action Air defense

#### Scenario: Relocating squadron
- **WHEN** a base's second squadron is being relocated and its other three have planes
- **THEN** the snapshot lists the base's first, third and fourth squadrons, in that order

#### Scenario: Area without bases
- **WHEN** a run starts on 2-5
- **THEN** the snapshot has no land bases, and the run continues

#### Scenario: Later game changes do not affect a running simulation
- **WHEN** the player changes a base's planes in game while a simulation is running
- **THEN** the running simulation keeps the bases captured when it started
