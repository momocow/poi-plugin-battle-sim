## MODIFIED Requirements

### Requirement: Automatic runs
The panel SHALL start a run by itself, as if Simulate were clicked, when any of these changes while the panel is open:
- the selected fleet;
- a ship in the selected fleet: added, removed, moved, swapped or remodeled;
- equipment on a ship in the selected fleet: equipped, removed, moved between slots, or improved;
- the selected map;
- a branch or phase choice of the selected map;
- the trial count;
- the node the selected fleet is at during a sortie, when it advances to another one, with or without a battle there;
- the current fuel, ammo or planes of a ship in the selected fleet: for example resupplying, supplies used in a sortie, or planes lost;
- the current HP of a ship in the selected fleet, up or down: for example damage in a sortie, between nodes or on returning, a docking that finishes, an instant repair, a repair ship's repair, or a modernization or marriage.

The panel SHALL also start a run by itself when the plugin comes into view while the panel has no run: none has started since the panel opened, or the last one was cancelled. The plugin comes into view when its tab becomes the one poi shows, whether the user selected it or poi's plugin auto switch brought it forward, and when the panel opens while its tab is already the one shown. In poi's double-tabbed layout, the plugin is in view when it is the plugin shown in the plugin pane. A panel with a run in progress, finished or failed SHALL NOT start a run on coming into view, even when that result is stale. Coming into view while the selected fleet does not qualify (see below) or while the Auto switch is off SHALL NOT start a run, then or later.

The run SHALL start once the inputs have stayed unchanged for the auto-run delay, so typing a custom trial count or a change made in several steps in game starts one run, with the final values. Each further change within the delay SHALL restart the wait.

The auto-run delay SHALL be a poi config setting in milliseconds, defaulting to 1000. A value that is not a whole number from 0 to 60000 SHALL be treated as the default. The plugin's poi settings page SHALL have a field for the delay. A changed delay SHALL apply from the next qualifying change, without restarting poi or reopening the panel.

It SHALL do so only when every ship present in the selected fleet has all its main slots filled, counting only the slots that ship has. The expansion slot SHALL NOT count, and the fleet need not be full: a fleet of three ships with every main slot filled qualifies. A fleet with no ships SHALL NOT start a run.

The control bar SHALL have an Auto switch, next to the Simulate button, that turns automatic runs on or off. It SHALL be on by default and SHALL be remembered between poi sessions. While it is off, no run starts by itself. Turning it on while the result on screen is dimmed as stale (see Result footer), and the selected fleet qualifies (see below), SHALL start a run at once, without waiting for the auto-run delay. Otherwise turning it on SHALL NOT start a run for changes made while it was off. The switch SHALL stay usable while a run is in progress; turning it off does not cancel that run.

Apart from coming into view as above, opening the panel and the game data loading SHALL NOT start a run. Changes to morale, level, or aircraft proficiency SHALL NOT start a run. A qualifying change while a run is in progress SHALL cancel that run and start a new one with the current fleet. When the fleets are combined and the combined fleet is selected, the scope is the ships of both fleets.

#### Scenario: Equipment filled
- **WHEN** fleet 1 has four ships, one of them with an empty main slot, and the user equips an item into that slot
- **THEN** a run starts for fleet 1 without the user clicking Simulate

#### Scenario: Empty slot left
- **WHEN** the user swaps a gun on one ship while another ship in the fleet still has an empty main slot
- **THEN** no run starts

#### Scenario: Expansion slot ignored
- **WHEN** every main slot is filled but a ship's expansion slot is empty, and the user changes the map
- **THEN** a run starts for the new map

#### Scenario: Branch choice
- **WHEN** the selected fleet has every main slot filled and the user changes the F → choice on 7-5
- **THEN** a run starts with the new choice

#### Scenario: Fleet switched
- **WHEN** the user switches from fleet 1 to fleet 2, and every ship in fleet 2 has all main slots filled
- **THEN** a run starts for fleet 2

#### Scenario: Custom trial count typed
- **WHEN** the user types 3000 into the custom trial count
- **THEN** one run starts, with 3000 trials

#### Scenario: Auto switched off
- **WHEN** the Auto switch is off and the user swaps equipment, leaving every main slot filled
- **THEN** no run starts until the user clicks Simulate

#### Scenario: Auto turned back on over a stale result
- **WHEN** the Auto switch is off, the fleet advances a node so the result is dimmed, and the user turns the switch on
- **THEN** a run starts at once, for the node the fleet is at

#### Scenario: Auto turned back on over a current result
- **WHEN** the Auto switch is off, nothing that the result depends on has changed, and the user turns the switch on
- **THEN** no run starts

#### Scenario: Change during a run
- **WHEN** a run is in progress and the user swaps equipment on a ship in the selected fleet, leaving every main slot filled
- **THEN** that run is cancelled and a new one starts with the changed fleet

#### Scenario: Sortie return
- **WHEN** the selected fleet returns from a sortie with lower HP and morale, no ship or equipment changed, and every main slot is filled
- **THEN** a run starts with the damaged HP

#### Scenario: Node without a battle
- **WHEN** the selected fleet advances to a node with no battle, with no HP change
- **THEN** a run starts for the rest of the sortie from that node

#### Scenario: Between nodes
- **WHEN** a run is in progress and the selected fleet advances to the next node of a sortie with lower HP
- **THEN** that run is cancelled, and a new one starts after the delay with the HP after the battle

#### Scenario: Resupply
- **WHEN** the user resupplies the selected fleet after a sortie, with every main slot filled
- **THEN** a run starts with full fuel, ammo and planes

#### Scenario: Morale only
- **WHEN** only the morale of ships in the selected fleet changes, as when fatigue recovers in port
- **THEN** no run starts

#### Scenario: Docking finished
- **WHEN** a ship in the selected fleet finishes repairing in the dock, no ship or equipment changed, and every main slot is filled
- **THEN** a run starts with the ship at its repaired HP

#### Scenario: Instant repair
- **WHEN** the user uses an instant repair on a damaged ship in the selected fleet, and every main slot is filled
- **THEN** a run starts with the ship at full HP

#### Scenario: Several repairs in a row
- **WHEN** the delay is 1000 ms and the user uses instant repairs on two ships of the selected fleet 500 ms apart
- **THEN** one run starts, about 1000 ms after the second repair, with both ships repaired

#### Scenario: Repair during a run
- **WHEN** a run is in progress and a ship in the selected fleet is repaired
- **THEN** that run is cancelled and a new one starts with the repaired HP

#### Scenario: Repair in another fleet
- **WHEN** fleet 1 is selected and a ship in fleet 2 is repaired
- **THEN** no run starts

#### Scenario: Repair with Auto off
- **WHEN** the Auto switch is off, a ship in the selected fleet is repaired, and then the user turns the switch on
- **THEN** no run starts

#### Scenario: Default delay
- **WHEN** the delay has never been set and the user swaps equipment, leaving every main slot filled
- **THEN** a run starts about 1000 ms after the swap, unless something else changes first

#### Scenario: Changes within the delay
- **WHEN** the delay is 1000 ms and the user makes a second qualifying change 600 ms after the first
- **THEN** one run starts, about 1000 ms after the second change, with the final values

#### Scenario: Custom delay
- **WHEN** the user sets the delay to 3000 on the settings page and then changes the map
- **THEN** a run starts about 3000 ms after the map change

#### Scenario: Invalid delay
- **WHEN** the config holds -5 or "fast" for the delay
- **THEN** automatic runs wait 1000 ms

#### Scenario: First view after poi starts
- **WHEN** poi has started, the panel has no run, the Auto switch is on, every ship in the selected fleet has all main slots filled, and the user selects the plugin's tab
- **THEN** a run starts about one auto-run delay later, without the user clicking Simulate

#### Scenario: Tab already shown at startup
- **WHEN** poi starts with the plugin's tab remembered as the shown tab, and the selected fleet qualifies once the panel opens
- **THEN** a run starts about one auto-run delay after the panel opens

#### Scenario: Result already shown
- **WHEN** a run has finished, the user switches to another tab, then back to the plugin's tab
- **THEN** no run starts and the finished result stays shown

#### Scenario: Stale result kept on focus
- **WHEN** a run on 1-4 has finished, the user selects 1-5 with the Auto switch off, switches to another tab and back
- **THEN** no run starts, and the 1-4 result stays shown, dimmed

#### Scenario: After a cancel
- **WHEN** the user cancels a run, switches to another tab, then back, and the selected fleet qualifies
- **THEN** a run starts

#### Scenario: Focus with an equipment swap
- **WHEN** the panel has no run, another tab is shown, and the user swaps a gun so poi's auto switch brings the plugin's tab forward
- **THEN** one run starts, with the fleet after the swap

#### Scenario: Focus with an incomplete fleet
- **WHEN** the panel has no run, a ship in the selected fleet has an empty main slot, and the user selects the plugin's tab
- **THEN** no run starts

#### Scenario: Focus with Auto off
- **WHEN** the panel has no run, the Auto switch is off, and the user selects the plugin's tab
- **THEN** no run starts

## ADDED Requirements

### Requirement: Mid-sortie runs
While the selected fleet is on a sortie, a run SHALL simulate the sortie's map, with the branch and phase choices remembered for that map, whatever map is selected in the panel. This is sortie mode; otherwise the panel is in plan mode. A round tag with an icon at the right end of the control bar's first row SHALL name the mode: a grey Plan mode (規劃模式) tag with a map icon in plan mode, a red Sortie mode (出擊模式) tag with a flag icon in sortie mode. In sortie mode, the fleet and map selects SHALL be disabled, and the map select SHALL show the sortie's map, with that map's branch and phase controls. The selected map SHALL stay remembered unchanged. Once the fleet is back in port, the tag SHALL show Plan mode again, the selects SHALL be enabled and show the selected map again, and runs SHALL use it. The run SHALL narrow the routes to the sortie's path so far (see route-prediction) and simulate them from the node the fleet is at (see battle-simulation). When the fleets are combined and the combined fleet is selected, the sortie is the combined fleet's.

While the selected map is the sortie's map, each branch control whose node the fleet has passed SHALL show the branch taken and SHALL NOT be changeable until the fleet is back in port. The choice remembered for the map SHALL NOT change. Branches not passed yet stay changeable, and runs use them.

The route cards SHALL show each route's nodes before the one the fleet is at as passed, visibly set apart from the nodes still ahead, with no retreat rate under them. The route probability on each card SHALL be the narrowed probability.

The footer SHALL name the sortie's map and the node the fleet is at, for example "5-2 at E", in place of the map. When the sortie's earlier battles were not observed from its start, the footer's result line SHALL end with a warning marker whose tooltip says that special attacks fired before are not known. The marker SHALL NOT take a line of its own. The result SHALL count as stale, and be dimmed as for other setting changes, once the fleet advances to another node or returns to port, until the next run. While the fleet is on a sortie, the sortie's map and choices count as the selected ones when deciding whether a result is stale, so a mid-sortie result is not dimmed just because the map select shows another map.

#### Scenario: Sortie on another map
- **WHEN** the panel's selected map is 1-5, the selected fleet sorties to 2-5, and advances to C
- **THEN** a run simulates 2-5 from C, the Sortie mode tag shows, and the fleet and map selects are disabled with the map select showing 2-5

#### Scenario: Sortie mode ends in port
- **WHEN** the fleet returns to port from that 2-5 sortie
- **THEN** the tag shows Plan mode again, and the selects are enabled again with the map select showing 1-5

#### Scenario: Back in port
- **WHEN** the fleet returns from a 2-5 sortie and the selected map is 1-5
- **THEN** the next run simulates 1-5 from its start

#### Scenario: Branch passed in game
- **WHEN** O → K is remembered for 5-3, and the selected fleet passes O to P on a 5-3 sortie
- **THEN** the O → control shows P and can't be changed, runs use O→P, and after the fleet returns to port the control shows K and is changeable again

#### Scenario: Passed nodes on a card
- **WHEN** a run is made with the fleet at L on route `1-C-E-G-L-O`
- **THEN** that card shows C, E and G as passed, with no retreat rates under them, and L and O as ahead

#### Scenario: Footer mid-sortie
- **WHEN** a run is made with fleet 1 at E on 5-2
- **THEN** the footer shows "5-2 at E"

#### Scenario: Footer for a sortie not observed from its start
- **WHEN** the plugin was turned off and on in poi's plugin settings while fleet 1 was at sea, and a run is made with the fleet at E on 5-2
- **THEN** the footer's result line shows "5-2 at E" and ends with a warning marker, and hovering over the marker says that earlier special attacks are not known

#### Scenario: Result after advancing
- **WHEN** a run at E has finished and the fleet advances to F with Auto off
- **THEN** the result stays visible but dimmed, with a note that the settings have changed
