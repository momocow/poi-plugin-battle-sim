## ADDED Requirements

### Requirement: Node formations
Each battle node of a map SHALL have a player formation, used when the fleet fights there (see battle-simulation, Player formation per node). The formations are the six single-fleet ones: 単縦陣, 複縦陣, 輪形陣, 梯形陣, 単横陣 and 警戒陣. A node's formation is the user's **map formation** for that node when one is set, else its **default** formation (see battle-simulation, Player formation per node). Map formations SHALL be remembered per map and node between poi sessions. Reset SHALL NOT change them.

The panel SHALL have a **Formations** button next to the Night battle switch, shown under the same condition as the Target dropdown: once the shown map's topology data is in the kcnav cache. Clicking it SHALL open the editor as a popup that lists every node of the shown map that has a battle (read from the topology data as for the Target dropdown), sorted by node letter, with the boss nodes marked. A predicted route is not needed. Each row SHALL show:
- the node letter;
- the reason for the node's default (normal battle, night battle, air battle, submarines only or submarines mixed);
- a select holding the node's formation. Its first option is **Default**, naming the default formation, for example "Default (輪形陣)", followed by the six formations. A map formation is shown as set by the user.

In the editor, picking a formation sets the node's map formation, and picking Default clears it. Below the rows, a **Reset all to default** button SHALL clear the map formations of every node of the map, as picking Default on each would; it SHALL be disabled when no node of the map has one. These edits SHALL take effect when the popup closes, however it is closed, and not before: while it is open they start no run and do not dim the result as stale. If, on closing, any node's formation differs from when the popup opened, the panel SHALL save the map formations and start one run at once, as if Simulate were clicked, whatever the Auto switch says. No further run SHALL start for the same change after the auto-run delay. If nothing differs, closing SHALL start no run. When Simulate is disabled (see Selection reset), closing saves the changes but starts no run.

The editor SHALL grey out, and SHALL NOT let the user pick, any formation that the selected fleet's ship count does not allow. Under the game's rule, which the optimizer applies:
- with fewer than 4 ships, only 単縦陣 is allowed;
- 輪形陣 needs at least 5 ships; with 4 ships the fleet uses 複縦陣 instead.

When a node's default or its map formation is not allowed, its row SHALL keep the choice and also say which formation the fleet gets, for example "輪形陣 → 複縦陣 (4 ships)". A map formation SHALL NOT be cleared because the current fleet can't use it.

The Formations button SHALL be disabled while a run is in progress. In sortie mode it SHALL stay editable, and it shows and sets the formations of the sortie's map. Before the shown map's topology data is in the kcnav cache, the button SHALL NOT be shown, and runs use the default formations.

#### Scenario: Editor for 5-2
- **WHEN** the selected map is 5-2, its topology data is cached, and the user clicks Formations
- **THEN** the editor lists the 5-2 battle nodes. C and L show "Default (輪形陣)" with the reason air raid, I shows "Default (輪形陣)" with the reason air battle, D shows "Default (梯形陣)" with the reason submarines mixed (one of its enemy compositions has submarines), E shows "Default (単縦陣)" with the reason normal battle, and O is marked as the boss

#### Scenario: Map formation remembered
- **WHEN** the user sets 5-2 node D to 複縦陣 in the editor, then closes poi and opens it again
- **THEN** the editor shows 複縦陣 at D, marked as set by the user, and runs on 5-2 use 複縦陣 at D

#### Scenario: Back to default
- **WHEN** 2-5 node E has the map formation 輪形陣 and the user picks Default
- **THEN** E shows its default formation, and it stays so after poi restarts

#### Scenario: Three-ship fleet
- **WHEN** the selected fleet has 3 ships and the user opens the editor
- **THEN** every formation but 単縦陣 is greyed out, and each row whose formation is not 単縦陣 also says the fleet gets 単縦陣

#### Scenario: Four-ship fleet at an air raid
- **WHEN** the selected fleet has 4 ships and the map is 5-2
- **THEN** 輪形陣 is greyed out, and C's row reads "Default (輪形陣)" and says the fleet gets 複縦陣

#### Scenario: Run on close
- **WHEN** the user opens the editor on 2-5, sets E to 単横陣 and O to 複縦陣, and closes it
- **THEN** no run starts while the popup is open, and one run starts when it closes, with 単横陣 at E and 複縦陣 at O

#### Scenario: Reset all to default
- **WHEN** 2-5 nodes E and O have map formations, and the user clicks Reset all to default and closes the editor
- **THEN** every 2-5 node shows its default formation, and one run starts with the defaults

#### Scenario: Closed without a change
- **WHEN** the user opens the editor, sets E to 単横陣, sets it back to what it was, and closes the popup
- **THEN** no run starts

#### Scenario: Run on close with Auto off
- **WHEN** the Auto switch is off, and the user changes a formation and closes the editor
- **THEN** a run starts at once

#### Scenario: Locked while running
- **WHEN** a run is in progress
- **THEN** the Formations button is disabled

#### Scenario: Before the topology is cached
- **WHEN** the user selects a map whose topology data is not in the kcnav cache yet
- **THEN** no Formations button is shown
