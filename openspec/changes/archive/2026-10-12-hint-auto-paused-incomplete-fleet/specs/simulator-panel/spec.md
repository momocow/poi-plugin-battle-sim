## ADDED Requirements

### Requirement: Auto paused for an incomplete fleet
Auto is paused while the Auto switch is on, a fleet is selected and the game data is loaded, the selected fleet has at least one ship, and the fleet does not qualify for automatic runs (see Automatic runs): a ship present in it has an empty main slot. The expansion slot SHALL NOT count, as in Automatic runs. When the fleets are combined and the combined fleet is selected, the ships of both fleets count.

While Auto is paused, the panel SHALL show it:
- the Auto switch SHALL stay on, and its checked track SHALL be shown in the warning colour instead of the primary colour;
- the Auto switch's tooltip SHALL add a line, after its usual text (see Narrow, top-down layout), saying that Auto is paused until every ship in the fleet has all its main slots filled;
- the Simulate button SHALL be primary, even though Auto is on, unless a run is in progress.

The hint SHALL follow the fleet live. When the fleet comes to qualify, the hint SHALL clear at once and automatic runs SHALL start as Automatic runs describes. When a slot is emptied, the hint SHALL show at once. Auto being paused SHALL NOT change the remembered state of the Auto switch, and SHALL NOT start or cancel a run. A run already in progress keeps running.

While the Auto switch is off, no fleet is selected, or the selected fleet has no ships, the panel SHALL NOT show the hint.

#### Scenario: Empty slot with Auto on
- **WHEN** the Auto switch is on and a ship in the selected fleet has an empty main slot
- **THEN** the Auto switch is shown on in the warning colour, and the Simulate button is primary

#### Scenario: Paused tooltip
- **WHEN** Auto is paused and the user hovers over the Auto switch
- **THEN** the tooltip shows its usual text, followed by a line saying that Auto is paused until every ship has all its main slots filled

#### Scenario: Slot filled
- **WHEN** Auto is paused and the user equips an item into the last empty main slot of the selected fleet
- **THEN** the Auto switch returns to the primary colour, the Simulate button is no longer primary, and a run starts after the auto-run delay

#### Scenario: Slot emptied
- **WHEN** the Auto switch is on, every main slot is filled, and the user unequips a gun from a ship in the selected fleet
- **THEN** the Auto switch turns to the warning colour, its tooltip says Auto is paused, and no run starts

#### Scenario: Expansion slot empty
- **WHEN** the Auto switch is on, every main slot of the selected fleet is filled, and a ship's expansion slot is empty
- **THEN** the panel does not show the hint

#### Scenario: Auto off
- **WHEN** the Auto switch is off and a ship in the selected fleet has an empty main slot
- **THEN** the Auto switch is shown off as usual, with no hint in its tooltip

#### Scenario: No fleet selected
- **WHEN** the selection is cleared and the Auto switch is on
- **THEN** the panel does not show the hint

#### Scenario: Running while paused
- **WHEN** Auto is paused and the user clicks Simulate
- **THEN** the run starts and the button reads Cancel, not as primary; the Auto switch stays in the warning colour

#### Scenario: Auto state kept
- **WHEN** Auto is paused, poi restarts, and the selected fleet now has every main slot filled
- **THEN** the Auto switch is on, with no hint
