## ADDED Requirements

### Requirement: Land bases
The panel SHALL have a **Land bases** button (陸航) next to the Node settings button. It SHALL be shown when the Node settings button is (see Node settings) and poi's state has at least one land base in the shown map's area (see fleet-capture, Snapshot the land bases of the map's area). Clicking it SHALL open an editor as a popup that lists the area's bases from poi's live state, in base number order. Each row SHALL show:
- the base number and name;
- the base's planes, as icons;
- its range;
- its action in game;
- for a base in Attack, two selects, **Wave 1** and **Wave 2**. Each offers **None** followed by the shown map's battle nodes, the same nodes the Node settings editor lists, sorted by node letter, with the boss nodes marked.

A base in any other action SHALL show no selects and SHALL say that it doesn't sortie in its current action. Its saved targets are kept.

A node whose distance is known (from the game-data package's node distances; see battle-simulation, Land-base range check) and greater than the base's range SHALL be greyed out, and the user SHALL NOT be able to pick it. A remembered target that is now out of range, for example after the base's planes changed, SHALL stay selected and SHALL be marked as out of range. When the shown map has no known distances, the popup SHALL say that the range can't be checked for the map, and every node SHALL be selectable.

Targets SHALL be remembered per map and base number between poi sessions. A map starts with no targets, so no base sorties on it until the user sets one. Reset SHALL NOT change targets. The editor SHALL have a **Clear all** button that sets every target of the map to None. It SHALL be disabled when every target already is None.

Edits SHALL take effect when the popup closes, as for Node settings: no run and no stale dimming while the popup is open. If any target differs from when the popup opened, closing it SHALL save the targets and start one run at once, whatever the Auto switch says, unless Simulate is disabled. Closing it with nothing changed SHALL start no run. A change in game to a base of the shown map's area SHALL start a run as a qualifying change does under Automatic runs, with the same delay and the same conditions. This covers its action, a plane added, removed or swapped, a plane's improvement, its plane count (for example after resupply), and its range. As for ships, a change to aircraft proficiency SHALL NOT start a run.

The Land bases button SHALL be disabled while a run is in progress. In sortie mode, when the sortie was observed from its start, the popup SHALL show the targets the player sent in game (see battle-simulation, Mid-sortie land-base assignment), read-only, with a note that the sortie's real assignment is used. When the sortie wasn't observed from its start, the popup SHALL show and set the panel's targets for the sortie's map.

#### Scenario: Popup on 6-4
- **WHEN** the selected map is 6-4, its topology is cached, poi has two area-6 bases, base 1 in Attack and base 2 in Air defense, and the user clicks Land bases
- **THEN** the popup lists both bases. Base 1 has Wave 1 and Wave 2 selects offering None and 6-4's battle nodes, with N marked as the boss. Base 2 shows that it doesn't sortie in Air defense

#### Scenario: Map without bases
- **WHEN** the selected map is 2-5
- **THEN** no Land bases button is shown

#### Scenario: Out of range
- **WHEN** base 1's range is 5, and the game-data package in use gives 6-4's N a distance of 6
- **THEN** N is greyed out in base 1's selects and can't be picked

#### Scenario: Unknown distances
- **WHEN** the game-data package in use doesn't list the shown map
- **THEN** the popup says the range can't be checked for the map, and every battle node can be picked

#### Scenario: Targets remembered per map
- **WHEN** the user sets base 1 on 6-4 to N and N, closes poi and opens it again
- **THEN** the popup on 6-4 shows N and N for base 1, and 6-5 is not affected

#### Scenario: Run on close
- **WHEN** the user sets base 1's Wave 1 to H and closes the popup
- **THEN** one run starts at once with base 1's wave at H

#### Scenario: Base changed in game
- **WHEN** the Auto switch is on and the player swaps a plane in a base of the shown map's area
- **THEN** a run starts after the auto-run delay

#### Scenario: Sortie mode
- **WHEN** the selected fleet sortied to 6-4 with base 1 sent to H and N, the plugin saw the sortie start, and the user opens Land bases
- **THEN** the popup shows base 1 at H and N, can't be edited, and notes that the sortie's real assignment is used
