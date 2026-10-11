## MODIFIED Requirements

### Requirement: Snapshot a single fleet from poi state
When the user starts a simulation, the system SHALL read the selected fleet (1–4) from poi's state at that moment. For every ship it SHALL capture the ship master ID, level, modernization bonuses (firepower, torpedo, anti-air, armor, luck, HP, ASW), current HP, morale, current fuel and ammo, the number of planes in each main slot the ship has, the equipment in main slots in slot order, and the equipment in the expansion slot. For every piece of equipment it SHALL capture the equipment master ID, improvement level, and aircraft proficiency.

#### Scenario: Fleet with equipped ships
- **WHEN** the user starts a simulation for fleet 1, which has 6 ships
- **THEN** the snapshot contains those 6 ships in fleet order, each with the attributes listed above taken from poi's state at that moment

#### Scenario: Unresupplied ship
- **WHEN** a ship with 35 fuel and 40 ammo at most has 20 fuel, 12 ammo, and 17, 9, 13, 1 planes in its four slots out of 17, 18, 13, 1
- **THEN** the snapshot records 20 fuel, 12 ammo and planes 17, 9, 13, 1 for it, with those maximums

#### Scenario: Later game changes do not affect a running simulation
- **WHEN** the user changes equipment in game while a simulation is running
- **THEN** the running simulation keeps the snapshot taken when it started
