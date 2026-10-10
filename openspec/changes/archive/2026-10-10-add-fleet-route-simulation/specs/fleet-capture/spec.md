## Purpose

Takes a snapshot of a fleet from poi's live game state and converts it into the inputs the simulator and the route predictor need, so the user never types ships or equipment by hand.

## ADDED Requirements

### Requirement: Snapshot a single fleet from poi state
When the user starts a simulation, the system SHALL read the selected fleet (1–4) from poi's state at that moment. For every ship it SHALL capture the ship master ID, level, modernization bonuses (firepower, torpedo, anti-air, armor, luck, HP, ASW), current HP, morale, the equipment in main slots in slot order, and the equipment in the expansion slot. For every piece of equipment it SHALL capture the equipment master ID, improvement level, and aircraft proficiency.

#### Scenario: Fleet with equipped ships
- **WHEN** the user starts a simulation for fleet 1, which has 6 ships
- **THEN** the snapshot contains those 6 ships in fleet order, each with the attributes listed above taken from poi's state at that moment

#### Scenario: Later game changes do not affect a running simulation
- **WHEN** the user changes equipment in game while a simulation is running
- **THEN** the running simulation keeps the snapshot taken when it started

### Requirement: Empty slots are handled
Empty main slots SHALL be left out of the snapshot. The ship's other equipment SHALL keep its slot order, and an expansion-slot item SHALL be kept even when main slots are empty.

#### Scenario: Ship with an empty slot in the middle
- **WHEN** a ship has equipment in slots 1 and 3, slot 2 is empty, and it has an expansion-slot item
- **THEN** the snapshot lists the slot 1 and slot 3 items in order and records the expansion-slot item separately

### Requirement: Reject unusable fleets
The system SHALL refuse to start a simulation, and SHALL say why, when the selected fleet has no ships, when poi has no game data yet (the player is not logged in), or when the fleet is part of a combined fleet.

#### Scenario: Not logged in
- **WHEN** the user starts a simulation before poi has loaded any game data
- **THEN** no simulation runs and the panel says that game data is not loaded yet

#### Scenario: Combined fleet selected
- **WHEN** fleets 1 and 2 are formed as a combined fleet and the user selects fleet 1 or fleet 2
- **THEN** no simulation runs and the panel says that combined fleets are not supported yet

### Requirement: Produce simulator and compass inputs from one snapshot
From the same snapshot, the system SHALL produce (a) the optimizer's inline fleet input and (b) a deck-builder v4 document for compass. The two SHALL describe the same ships and equipment.

#### Scenario: Both outputs agree
- **WHEN** a snapshot of 6 ships is converted
- **THEN** both outputs contain the same 6 ship master IDs in the same order, with the same equipment IDs and improvement levels
