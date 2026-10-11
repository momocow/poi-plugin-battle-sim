## ADDED Requirements

### Requirement: Start from current supply and planes
Each simulation SHALL start every ship with its captured current HP, fuel, ammo, and planes in each main slot, in every trial. A value at its maximum SHALL be treated as full. The plane counts SHALL cover the main slots the ship has, in slot order, and not the expansion slot.

#### Scenario: Unresupplied fleet
- **WHEN** the flagship has 12 of 40 ammo and lost 9 planes in its second slot
- **THEN** every trial starts the flagship at 12 ammo with 9 planes in that slot

#### Scenario: Resupplied fleet
- **WHEN** every ship has full fuel, ammo and planes
- **THEN** the simulation runs as with a fully supplied fleet
