## MODIFIED Requirements

### Requirement: Reject unusable fleets
The system SHALL refuse to start a simulation, and SHALL say why, when the selected fleet has no ships or when poi has no game data yet (the player is not logged in). When fleets 1 and 2 are combined in game, selecting fleet 1 or fleet 2 on its own SHALL also be refused, with a message pointing to the combined fleet option. A combined fleet SHALL also be refused when its main or escort fleet has no ships.

#### Scenario: Not logged in
- **WHEN** the user starts a simulation before poi has loaded any game data
- **THEN** no simulation runs and the panel says that game data is not loaded yet

#### Scenario: Single fleet selected while combined
- **WHEN** fleets 1 and 2 are combined in game and the user selects fleet 1 on its own
- **THEN** no simulation runs and the panel says to choose "Combined fleet (1+2)" instead

## ADDED Requirements

### Requirement: Capture a combined fleet
When fleets 1 and 2 are combined in game and the user selects the combined fleet, the snapshot SHALL contain the main fleet (fleet 1) and the escort fleet (fleet 2) in fleet order, each ship captured as for a single fleet. It SHALL also contain the combined type, read from poi's combined-fleet state: Carrier Task Force (1), Surface Task Force (2), or Transport Escort (3).

#### Scenario: Surface Task Force
- **WHEN** fleets 1 and 2 are combined as a Surface Task Force with 6 ships each, and the user starts a simulation for the combined fleet
- **THEN** the snapshot has 6 main ships, 6 escort ships, and the type Surface Task Force

#### Scenario: Split in game during a run
- **WHEN** the player splits the combined fleet in game while a combined simulation is running
- **THEN** the running simulation keeps the combined snapshot

### Requirement: Combined-fleet inputs agree
From a combined snapshot, the system SHALL produce optimizer input that has a main fleet, an escort fleet, and the combined type, and a deck-builder document for compass that has the main fleet as `f1`, the escort fleet as `f2`, and the matching fleet type. Both SHALL describe the same ships, in the same fleets, with the same equipment.

#### Scenario: Both outputs agree
- **WHEN** a Carrier Task Force snapshot is converted
- **THEN** both outputs place the same ship IDs in the main and escort fleets, with the same equipment and improvement levels, and both name Carrier Task Force
