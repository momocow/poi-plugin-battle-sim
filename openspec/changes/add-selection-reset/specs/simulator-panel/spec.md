## ADDED Requirements

### Requirement: Selection reset
The control bar SHALL have a Reset button that clears the fleet and map selection, so the panel has no target until the user picks one. After a reset, the fleet and map selects SHALL each show an empty choice. Picking a fleet or a map fills in that select again. The empty choice SHALL only come from Reset; the user cannot pick it from the select's list.

Reset SHALL stop the panel's work: a run in progress is cancelled, a pending automatic run is dropped, and any result, error, or status on screen is cleared, as after Cancel. Reset SHALL stay usable while a run is in progress. It SHALL be disabled when neither a fleet nor a map is selected.

Reset SHALL NOT change the trial count, the Auto switch, or the remembered branch and phase choices of any map.

While the fleet or the map is not selected:
- Simulate SHALL be disabled.
- No run SHALL start by itself: not on a change in game, not on a trial-count change, and not when the plugin comes into view.
- With no map selected, no branch or phase controls are shown.
- With no fleet selected, the fleet display SHALL show a hint to pick a fleet instead of a fleet. With a fleet but no map, it SHALL show the live fleet, with LoS at ×1.

Once both a fleet and a map are selected again, the selection counts as changed, so an automatic run SHALL start under the usual conditions of Automatic runs (the Auto switch on, the fleet qualifying, the auto-run delay), even when the user picks the same fleet and map as before the reset.

A cleared selection SHALL be remembered between poi sessions like any other selection. A fleet or map that was never chosen SHALL still start at fleet 1 and 1-1.

#### Scenario: Reset during a run
- **WHEN** a run on 5-2 with fleet 1 is in progress and the user clicks Reset
- **THEN** the run is cancelled, the fleet and map selects show an empty choice, no result or status is shown, and Simulate is disabled

#### Scenario: Reset with a finished result
- **WHEN** a run has finished and the user clicks Reset
- **THEN** the result and the footer are cleared and the panel shows no route cards

#### Scenario: Pending automatic run dropped
- **WHEN** a qualifying change has just been made, so an automatic run is waiting out the delay, and the user clicks Reset
- **THEN** no run starts

#### Scenario: No runs while unselected
- **WHEN** the selection is cleared, the Auto switch is on, and the user swaps equipment in fleet 1, leaving every main slot filled
- **THEN** no run starts

#### Scenario: No run on coming into view
- **WHEN** the selection is cleared, the Auto switch is on, and the user switches to another tab and back to the plugin's tab
- **THEN** no run starts

#### Scenario: New target picked
- **WHEN** the selection is cleared, the Auto switch is on, and the user picks fleet 2 and then 1-5, and every ship in fleet 2 has all main slots filled
- **THEN** one run starts for fleet 2 on 1-5, after the auto-run delay

#### Scenario: Same target picked again
- **WHEN** the user resets with fleet 1 and 5-2 selected, then picks fleet 1 and 5-2 again, the fleet qualifies, and the Auto switch is on
- **THEN** a run starts

#### Scenario: Fleet only
- **WHEN** the selection is cleared and the user picks fleet 1 but no map
- **THEN** the fleet display shows fleet 1 live with LoS at ×1, Simulate stays disabled, and no run starts

#### Scenario: Other settings kept
- **WHEN** the trial count is a custom 3000, the Auto switch is off, 7-5's F → choice is J, and the user clicks Reset and then picks 7-5
- **THEN** the trials control still shows Custom with 3000, the Auto switch is still off, and F → shows J

#### Scenario: Cleared selection restored
- **WHEN** the user clicks Reset, closes poi, and opens it again
- **THEN** the panel opens with the fleet and map selects empty, and no run starts
