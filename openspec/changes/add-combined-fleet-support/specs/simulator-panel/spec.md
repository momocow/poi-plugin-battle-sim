## ADDED Requirements

### Requirement: Combined fleet choice
When fleets 1 and 2 are combined in game, the fleet selector SHALL offer "Combined fleet (1+2)" labeled with its type, for example "Combined (1+2) · Surface". It SHALL be pre-selected if the user had chosen fleet 1 or 2. When the fleets are split again, the option SHALL disappear and the selection SHALL fall back to fleet 1. A remembered combined selection whose fleets are no longer combined SHALL fall back to fleet 1 on load.

#### Scenario: Fleets combined in game
- **WHEN** fleet 1 is selected and the player combines fleets 1 and 2 as a Carrier Task Force
- **THEN** the selector shows "Combined (1+2) · Carrier" and selects it

#### Scenario: Fleets split in game
- **WHEN** the combined fleet is selected and the player splits the fleets
- **THEN** the combined option disappears and fleet 1 is selected

### Requirement: Two-fleet display
For a combined fleet, the fleet display SHALL show a header naming the combined type, then the main fleet and the escort fleet as two labeled groups. Each group SHALL have its own summary row (speed, fighter power, and LoS) and its ships shown as for a single fleet. Both groups SHALL be collapsible together, as in the single-fleet display, and the layout SHALL remain a single top-down column.

#### Scenario: Snapshot of a combined fleet
- **WHEN** a combined run starts
- **THEN** both groups switch to the snapshot, and the Snapshot tag with its capture time appears once in the header
