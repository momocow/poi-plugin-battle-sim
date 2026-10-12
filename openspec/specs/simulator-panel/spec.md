# simulator-panel Specification

## Purpose

The poi plugin panel where the user picks a fleet and a map, checks or edits the predicted routes, runs the simulation, and reads the results.

## Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3). Event maps SHALL NOT be offered. The map options SHALL be grouped by world, each group labeled with the world number and its sea-area name from the game data (for example "1: 鎮守府海域"), or the number only when the game data is not loaded. Each map option SHALL show the map number and its name from the game data, for example "1-1 鎮守府正面海域", in the open list and in the closed select alike; the closed select SHALL be width-capped like the fleet select, truncating a long name with an ellipsis. Hovering the fleet or map select SHALL show a tooltip with the selection's full label, also while the select is locked. Each fleet option SHALL show the fleet number and its in-game name, for example "1: 第一艦隊". When the game data is not loaded, the option SHALL show the number only.

The plugin's poi settings page, not the panel, SHALL let the user set the number of trials per route with these presets:
- Quick (500)
- Normal (2000), the default
- Precise (10000)
- Custom, which shows a number field accepting 1–100000

The trial count SHALL be a poi config setting. A count that matches a preset SHALL select that preset. Any other count SHALL select Custom with that count filled in. A value that is not a whole number of at least 1 SHALL be treated as 2000, and one above 100000 as 100000. A changed count SHALL apply to the open panel at once, as a change of the trial count (see Automatic runs and Result footer), without restarting poi or reopening the panel. The panel SHALL NOT show a trials control. The last fleet and map chosen SHALL be remembered between poi sessions.

When the selected map has player-selected branches or a phase, the panel SHALL show one control per choice, labeled with the node and an arrow (for example "F →"), its targets listed in the dropdown, or as "Phase". Each control starts at compass's default choice. The choices SHALL be remembered per map between poi sessions. Maps without such choices SHALL show no extra controls. Choices SHALL NOT be editable while a run is in progress.

The panel SHALL have a **Target** dropdown that sets the node the sortie being planned ends at (see route-prediction, Target reach). Its first option is **Boss**, the default. Once compass has predicted the map in this poi session, the Boss option SHALL name the boss node, for example "Q (Boss)": the boss letters that the predicted candidates end at (narrowed to the sortie's path in sortie mode), or, when none ends at a boss, all of the map's boss letters, joined by "/". After it come the node letters on the candidates that compass last predicted for the map in this poi session, before any narrowing or cut, each once and in alphabetical order. The start node, the map's boss letters, and nodes without a battle are not listed. Whether a node has a battle SHALL be read from the map's topology data in the kcnav cache, as the optimizer reads it: a maelstrom, or a node that every route into it marks as a resource, empty or other pass-through node, has no battle; any other node, air raids included, has one. Before compass has predicted the map in this poi session, Boss is the only option. A remembered target that is not among the options SHALL still be shown and selected. There SHALL be one target, not one per map, and it SHALL be remembered between poi sessions. Selecting another map SHALL set it back to Boss and turn the Night battle switch back on. Entering or leaving sortie mode, which changes the map shown but not the map selected, SHALL NOT change the selected map's target or switch.

The Target dropdown and the Night battle switch SHALL be shown only once the shown map's topology data is in the kcnav cache, which the map's shared enemy-data fetch writes (see battle-simulation). Until then, runs SHALL use the Boss target with night battle on, whatever target and switch are remembered, as when the panel had no target. The row SHALL appear without a new run or reopening the panel once the fetch has written the data. On a map's first run that happens during the run, while the row is not editable, so the first run of a map simulates the boss, and the user can change the target once its result is shown.

Next to the Target dropdown, the panel SHALL have a **Night battle** switch that sets whether the fleet pursues night battle at the target. It SHALL be on by default and SHALL be remembered between poi sessions. It applies to every map. When the target is a night-battle node, where the battle is a night battle only (read from the map's topology data as the optimizer reads it: most edges into the node have color 11), the fleet fights a night battle there whatever the switch says. The switch SHALL then show on and SHALL NOT be editable, with a tooltip saying that the node is always a night battle, and runs SHALL count as pursuing night battle. The remembered switch SHALL stay as it was, and apply again once the target is another node.

The Target dropdown and the Night battle switch SHALL NOT be editable while a run is in progress. In sortie mode they SHALL stay editable, and they show and set the sortie's target and switch (see Mid-sortie runs). In sortie mode the Target dropdown SHALL list only the nodes the fleet can still reach: those on the candidates narrowed to the sortie's path so far, from the node the fleet is at on. Nodes already passed, and nodes on routes the fleet can no longer take, are not listed.

#### Scenario: Target options after a prediction
- **WHEN** the selected map is 2-5, whose boss is O, and the last prediction this session gave `1-C-D`, `1-C-E-G-L-N` and `1-C-E-G-L-O`
- **THEN** the Target dropdown offers Boss, C, E and L, leaving out D (no battle), G (a maelstrom), N (a resource node), and the boss O

#### Scenario: Boss option names the boss node
- **WHEN** the selected map is 5-3, and the last prediction this session ends at its boss Q
- **THEN** the Target dropdown's first option reads "Q (Boss)"

#### Scenario: Target before any prediction
- **WHEN** poi has just started, the selected map's topology data is in the kcnav cache, the map has not been predicted yet, and no target is remembered for it
- **THEN** the Target dropdown offers Boss only, and Boss is selected

#### Scenario: First time on a map
- **WHEN** the user selects a map whose topology data is not in the kcnav cache yet, and a run starts
- **THEN** no Target dropdown or Night battle switch is shown at first, and the run uses the Boss target with night battle on; once its result is shown, the user can pick a target and switch night battle

#### Scenario: Remembered target restored
- **WHEN** the user set the target to E on 2-5, closes poi, and opens it again
- **THEN** with 2-5 selected the Target dropdown shows E, even before the map is predicted, as the map's topology data is still in the kcnav cache

#### Scenario: Map change resets the target
- **WHEN** the user sets the target to E and turns Night battle off on 2-5, and then selects 1-1
- **THEN** the target is Boss and Night battle is on, and selecting 2-5 again keeps them so

#### Scenario: Target kept into a sortie
- **WHEN** the selected map is 2-5 with the target E and Night battle off, and the selected fleet sorties to 2-5
- **THEN** the target stays E and Night battle off in sortie mode, and after the fleet returns to port

#### Scenario: Target in a sortie on another map
- **WHEN** the selected map is 1-5 with the target E and Night battle off, and the selected fleet sorties to 2-5
- **THEN** sortie mode starts at Boss with Night battle on, and after the fleet returns to port 1-5's target is E and Night battle off again

#### Scenario: Night-battle node target
- **WHEN** the target on 5-3 is P, a night-battle node
- **THEN** the Night battle switch shows on and can't be changed, hovering over it says that P is always a night battle, and the footer does not say "No night battle"; with the switch remembered off, picking a target that is not a night-battle node shows it off again

#### Scenario: Target options mid-sortie
- **WHEN** the fleet is at E on 2-5 after passing C, and the last prediction gave `1-C-D`, `1-C-E-G-L-N` and `1-C-E-G-L-O`
- **THEN** the Target dropdown offers Boss, E and L: C has been passed, D can no longer be reached, and G and N have no battle

#### Scenario: Night battle switch restored
- **WHEN** the user turned Night battle off, closes poi, and opens it again
- **THEN** the switch is off

#### Scenario: Branch controls for 7-5
- **WHEN** the user selects 7-5
- **THEN** the panel shows three controls, F → (G or J), H → (I or K), and O → (P or Q), set to G, I, and P unless the user changed them before

#### Scenario: No controls for 5-2
- **WHEN** the user selects 5-2
- **THEN** no branch or phase controls are shown

#### Scenario: Restored selection
- **WHEN** the user picked fleet 2 and 5-2, closes poi, and opens it again
- **THEN** the panel opens with fleet 2 and 5-2 selected

#### Scenario: Fleet names
- **WHEN** fleet 3 is named "輸送部隊" in game
- **THEN** the fleet select lists "3: 輸送部隊"

#### Scenario: Custom trial count restored
- **WHEN** the user set a custom count of 3000, closes poi, and opens it again
- **THEN** the settings page's trials control shows Custom with 3000, and runs use 3000 trials

#### Scenario: Count changed on the settings page
- **WHEN** a 2000-trial run has finished, Auto is on, and the user selects Precise (10000) on the settings page
- **THEN** the panel's result is dimmed as stale, and after the auto-run delay a run starts with 10000 trials

#### Scenario: Count carried over
- **WHEN** a user who had chosen Quick (500) in the panel's controls bar updates to this version
- **THEN** the settings page shows Quick (500) and runs use 500 trials

#### Scenario: No trials control in the panel
- **WHEN** the panel is open
- **THEN** its controls bar shows no trials select or count field

### Requirement: Fleet display
The panel SHALL show the fleet being simulated. Before a run, it SHALL show the selected fleet from live game state and update when that state changes, marked Live next to the fleet label. Once a run starts, it SHALL show the captured snapshot instead, and it SHALL keep showing that snapshot through the results, even if the game state changes.

The display SHALL have:
- **A summary row** with the following:
  - fleet speed;
  - fighter power;
  - line of sight (LoS) by Formula 33, at the multiplier that applies to the selected map: ×3 for 6-2 and 6-3, ×4 for 3-5 and 6-1, and ×1 otherwise. The multiplier is shown next to the value, and hovering over the value shows ×1, ×3 and ×4.
  - When any ship is below full HP, a warning with the number of damaged ships.
- **One row per ship**, laid out after poi's fleet tab: level and ship type above the ship name, then current and maximum HP with morale, then fuel and ammo, then the equipment.
  - HP SHALL be shown as `now / max` above a bar whose length is the HP ratio, colored by damage state as poi colors it:
    - no damage above 75% of maximum;
    - 小破 above 50% and at most 75%;
    - 中破 above 25% and at most 50%;
    - 大破 at most 25%.
  - Hovering over a damaged ship's HP SHALL name its damage state.
  - Morale SHALL be shown as its number with poi's colored square, in poi's bands (0–19, 20–29, 30–39, 40–48, 49, 50–52, 53 and above), so a sparkled ship shows a yellow square and an unchanged ship a white one.
  - Fuel and ammo SHALL be shown as two thin bars stacked fuel above ammo, as on poi's fleet tab, each as long as the current/maximum ratio and colored as poi colors supply:
    - green when full;
    - yellow below full and above 75%;
    - orange above 50% and at most 75%;
    - red at most 50%.
  - Hovering over a fuel or ammo bar SHALL show that resource's icon and `now / max`, followed, when below full, by the resupply cost as poi computes it: the missing amount, reduced by 15% and rounded down for a ship above level 99, and at least 1 — for example `10 / 15 (-5)`.
  - When a ship's maximum fuel or ammo is not known, that bar SHALL NOT be shown.
- **Per ship, its equipment in slot order, as icons.**
  - Hovering over an icon shows the item's name, the improvement level as ★N when above 0, and an aircraft proficiency marker when proficiency is between 1 and 7.
  - The expansion-slot item is shown after the main slots and visibly set apart.
  - Empty slots are not shown.

Names SHALL follow poi's language setting.

#### Scenario: Live fleet before running
- **WHEN** the user selects fleet 2 and then swaps a piece of equipment in game
- **THEN** the panel shows fleet 2 with the new equipment, and the summary values update

#### Scenario: Snapshot during and after a run
- **WHEN** a run has started and the user then changes fleet 2 in game
- **THEN** the panel keeps showing the snapshot taken when the run started, and the footer shows its capture time

#### Scenario: Improved and skilled equipment
- **WHEN** a ship carries a ★10 gun and a fighter with proficiency 7
- **THEN** both show as icons; hovering over the gun shows its name with ★10, and hovering over the fighter shows the proficiency-7 marker

#### Scenario: Damaged ship
- **WHEN** a ship has 20 of 45 HP and another has 44 of 45
- **THEN** the first shows 20 / 45 with an orange (中破) bar, the second shows 44 / 45 with a green bar, and the summary row warns of 2 damaged ships

#### Scenario: Morale
- **WHEN** a ship has morale 53 and another has morale 49
- **THEN** the first shows 53 with a yellow square, and the second shows 49 with a white square

#### Scenario: LoS for 6-1
- **WHEN** the selected map is 6-1
- **THEN** the summary row shows the ×4 LoS value labeled ×4

#### Scenario: Under-supplied ship
- **WHEN** a level-50 ship has 10 of 15 fuel and 20 of 20 ammo
- **THEN** its fuel bar is two thirds long and orange, and hovering over it shows the fuel icon with `10 / 15 (-5)`; its ammo bar is full and green, and hovering over it shows `20 / 20` with no cost

#### Scenario: Resupply cost for a married ship
- **WHEN** a level-175 ship has 0 of 15 fuel
- **THEN** its fuel bar is empty and red, and hovering over it shows `0 / 15 (-12)`

#### Scenario: Supply in the snapshot
- **WHEN** a run has started and the ship is then resupplied in game
- **THEN** the fuel and ammo bars keep showing the levels captured when the run started

### Requirement: Automatic runs
The panel SHALL start a run by itself, as if Simulate were clicked, when any of these changes while the panel is open:
- the selected fleet;
- a ship in the selected fleet: added, removed, moved, swapped or remodeled;
- equipment on a ship in the selected fleet: equipped, removed, moved between slots, or improved;
- the selected map;
- a branch or phase choice of the selected map;
- the target;
- the Night battle switch;
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

#### Scenario: Target changed
- **WHEN** the selected fleet has every main slot filled and the user changes the 2-5 target from Boss to E
- **THEN** a run starts with target E, and compass is not loaded again for it

#### Scenario: Night battle switched
- **WHEN** the selected fleet has every main slot filled and the user turns Night battle off
- **THEN** a run starts without night battle at the target

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

### Requirement: Mid-sortie runs
While the selected fleet is on a sortie, a run SHALL simulate the sortie's map, with the branch and phase choices remembered for that map, whatever map is selected in the panel. This is sortie mode; otherwise the panel is in plan mode. A round tag with an icon, floating right on the controls' fleet row (see Narrow, top-down layout), SHALL name the mode: a grey Plan mode (規劃模式) tag with a map icon in plan mode, a red Sortie mode (出擊模式) tag with a flag icon in sortie mode. Hovering over the tag SHALL show a tooltip naming the mode and saying what it means: in plan mode, that runs use the fleet and map selected in the panel; in sortie mode, that runs use the sortie's fleet and map, following its progress. In sortie mode, the fleet and map selects SHALL be disabled, and the map select SHALL show the sortie's map, with that map's branch and phase controls. The selected map SHALL stay remembered unchanged.

The sortie's target and Night battle switch SHALL be the panel's own when the sortie's map is the selected map: sortie mode uses them, and a change in sortie mode changes them. When the sortie's map is another map, the sortie SHALL have its own target and switch, starting at Boss and on, and changes in sortie mode SHALL apply to that sortie only. They SHALL NOT be remembered after the sortie ends, nor between poi sessions, and the selected map's target and switch SHALL be unchanged when the fleet is back in port. Once the fleet is back in port, the tag SHALL show Plan mode again, the selects SHALL be enabled and show the selected map again, and runs SHALL use it. The run SHALL narrow the routes to the sortie's path so far (see route-prediction) and simulate them from the node the fleet is at (see battle-simulation). When the fleets are combined and the combined fleet is selected, the sortie is the combined fleet's.

While the selected map is the sortie's map, each branch control whose node the fleet has passed SHALL show the branch taken and SHALL NOT be changeable until the fleet is back in port. The choice remembered for the map SHALL NOT change. Branches not passed yet stay changeable, and runs use them.

The route cards SHALL show each route's nodes before the one the fleet is at as passed, visibly set apart from the nodes still ahead, with no retreat rate under them. The route probability on each card SHALL be the narrowed probability.

The footer SHALL name the sortie's map and the node the fleet is at, for example "5-2 at E", in place of the map. When the sortie's earlier battles were not observed from its start, the footer's result line SHALL end with a warning marker whose tooltip says that special attacks fired before are not known. The marker SHALL NOT take a line of its own. The result SHALL count as stale, and be dimmed as for other setting changes, once the fleet advances to another node or returns to port, until the next run. While the fleet is on a sortie, the sortie's map and choices count as the selected ones when deciding whether a result is stale, so a mid-sortie result is not dimmed just because the map select shows another map.

#### Scenario: Sortie on another map
- **WHEN** the panel's selected map is 1-5, the selected fleet sorties to 2-5, and advances to C
- **THEN** a run simulates 2-5 from C, the Sortie mode tag shows, and the fleet and map selects are disabled with the map select showing 2-5

#### Scenario: Mode tooltip
- **WHEN** the user hovers over the mode tag
- **THEN** in plan mode, a tooltip shows "Plan mode" and that runs use the fleet and map selected here; in sortie mode, it shows "Sortie mode" and that runs use the sortie's fleet and map, following its progress

#### Scenario: Sortie mode ends in port
- **WHEN** the fleet returns to port from that 2-5 sortie
- **THEN** the tag shows Plan mode again, and the selects are enabled again with the map select showing 1-5

#### Scenario: Back in port
- **WHEN** the fleet returns from a 2-5 sortie and the selected map is 1-5
- **THEN** the next run simulates 1-5 from its start

#### Scenario: Branch passed in game
- **WHEN** O → K is remembered for 5-3, and the selected fleet passes O to P on a 5-3 sortie
- **THEN** the O → control shows P and can't be changed, runs use O→P, and after the fleet returns to port the control shows K and is changeable again

#### Scenario: Target in sortie mode
- **WHEN** the selected map is 2-5, the target is E, and the selected fleet is at C on a 2-5 sortie
- **THEN** the Target dropdown shows E and can be changed, and a run simulates 2-5 from C up to E

#### Scenario: Target changed in sortie mode
- **WHEN** the selected map is 2-5, the selected fleet is at C on a 2-5 sortie, and the user sets the target to L
- **THEN** a run starts up to L, and the target stays L after the fleet returns to port

#### Scenario: Target changed in a sortie on another map
- **WHEN** the selected map is 1-5 with the Boss target, the selected fleet is at C on a 2-5 sortie, and the user sets the target to L
- **THEN** a run starts up to L, and after the fleet returns to port 1-5's target is still Boss

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
- **THEN** the result stays visible but dimmed, and the footer's result line ends with the stale marker

### Requirement: Auto focus
poi SHALL switch to the plugin's tab when a ship or its equipment is changed in game, and the change leaves the ships or equipment of the selected fleet different from what the panel last showed. The changes that count are: a ship placed in, removed from, or moved within or into or out of the selected fleet; a fleet preset loaded into it; a ship in it remodeled or modernized; equipment on a ship in it equipped, removed, improved, or moved between slots or ships; or an expansion slot opened on a ship in it. When the fleets are combined and the combined fleet is selected, the selected fleet is both fleets. Entering the remodel screen, and changes that leave the selected fleet's ships and equipment as they were, such as a change to another fleet only, SHALL NOT switch the tab. Changes to HP, morale or level SHALL NOT switch the tab, including repairs, so that poi's own switch to its main view on the docking screen and on returning to port stands.

Whether the selected fleet qualifies for an automatic run, and the Auto switch, SHALL NOT affect switching the tab.

The plugin SHALL declare these requests to poi's plugin auto switch rather than switch tabs itself, so the on/off checkbox is poi's "Enable auto switch" setting for this plugin, on by default and remembered by poi. poi's global auto-switch setting also applies.

#### Scenario: Equipment swapped
- **WHEN** auto switch is on, fleet 1 is selected, poi shows another tab, and the user swaps a gun on a ship in fleet 1
- **THEN** poi switches to the plugin's tab

#### Scenario: Equipment swapped in another fleet
- **WHEN** auto switch is on, fleet 1 is selected, poi shows another tab, and the user swaps a gun on a ship in fleet 2
- **THEN** poi stays on its current tab

#### Scenario: Ship moved into the selected fleet
- **WHEN** fleet 1 is selected and the user moves a ship from fleet 2 into fleet 1
- **THEN** poi switches to the plugin's tab

#### Scenario: Instant repair
- **WHEN** auto switch is on, fleet 1 is selected, and the user uses an instant repair on a ship in fleet 1
- **THEN** the plugin does not switch the tab, so poi shows its main view as it does for the docking screen, and an automatic run starts in the background

#### Scenario: Return from a sortie
- **WHEN** the selected fleet returns to port damaged, with no ship or equipment changed
- **THEN** poi does not switch to the plugin's tab

#### Scenario: Remodel screen entered
- **WHEN** auto switch is on and the user enters the remodel screen without changing anything
- **THEN** poi stays on its current tab

#### Scenario: Incomplete fleet
- **WHEN** the user unequips a gun from a ship in the selected fleet, leaving a main slot empty
- **THEN** poi switches to the plugin's tab, and no run starts

#### Scenario: Auto switch off
- **WHEN** the user unchecks "Enable auto switch" for this plugin and swaps a gun on a ship in the selected fleet
- **THEN** poi stays on its current tab

### Requirement: Progress and cancel
The panel SHALL show the run's status in a compact area at the right of the footer, without taking a line of its own:
- While routes are predicted, it shows that routes are being predicted.
- While routes are simulated, it shows how many routes are finished out of the total, with a progress bar.
- While the run waits for the map's enemy-data fetch, it shows a short "fetching enemy data" note until that fetch ends. Hovering over the note shows the full explanation, including that this may take 15 seconds or more.
- When the run finishes, it shows "Done", and hides that after about 3 seconds.
- When a development optimizer is in use, it shows a small warning marker. Hovering over the marker says a development optimizer is in use.

A single action button SHALL read Simulate when no run is in progress and Cancel while a run is in progress.

#### Scenario: Running
- **WHEN** 1 of 3 routes has finished
- **THEN** the status area shows "1 / 3" with a progress bar a third full, and the action button reads Cancel

#### Scenario: First run of a map
- **WHEN** a map is simulated for the first time
- **THEN** the status area shows the short fetching note, and the note clears once the fetch ends

#### Scenario: Done fades
- **WHEN** a run finishes
- **THEN** the status area shows "Done", hides it about 3 seconds later, and the action button reads Simulate

### Requirement: Route cards
Once routes are predicted, the panel SHALL show one card per route candidate, after any cut and merge for a node target (see route-prediction, Target reach). The cards SHALL put the most promising route first. Finished routes SHALL come first, ordered by their weighted S rate (route probability times S over all of the route's trials), highest first; when equal, by weighted A or better; when still equal, by weighted B or better. Then come routes still being simulated, then routes that do not reach the target. Ties, and the order within the last two groups, SHALL go by probability, highest first. Simulation SHALL start straight away, with no confirmation step. Each card SHALL have three parts, left to right:
- **Route probability and reach target**: the route's probability, and its chance of reaching the target over all of its trials, each as a labeled percentage. Reach target shows "—" until the route has a result and for routes that do not reach the target.
- **Route** as a stepper: one circle per node after the start node, labeled with its letter and joined by a track, with the last node marked as the target when the route reaches the target, as the boss for the Boss target. Hovering over the stepper shows the route text: the node letters joined by `-`, with `[Boss]` appended when the last node is a boss node, for example `A-B-C2-D[Boss]`. Under each node where some trials turned back, its **retreat rate** is shown, for example "−10.7%". Nodes with no retreats show none. Neighboring rates SHALL NOT overlap.
- **Target results** among trials that reached the target: S, then A and B as set by the rank display (see Rank display setting) — individually, labeled `A` and `B`, or cumulatively, labeled `A+` and `B+` for A or better and B or better — and flagship sunk.

Apart from reach target, the cards SHALL NOT show rates over all of a route's trials; those appear, probability-weighted, in the summary.

Labels that name the target SHALL say "boss" for the Boss target, for example "Reach boss" and "Boss sunk", and SHALL name the node for a node target, for example "Reach E" and "E flagship sunk". They SHALL follow the run's target, not the target selected since.

A card's results SHALL show that they are pending until that route's simulation finishes. They SHALL be filled in as each route completes. Cards for routes that do not reach the target SHALL say they are not simulated, rather than showing 0%; for a node target they SHALL say that the route does not reach that node.

Mid-sortie, a route that has passed the target (see route-prediction) SHALL show its nodes up to the target, all as passed, with the target marked; its reach target SHALL read 100%, and in place of the results it SHALL say that the target has been reached. The summary SHALL then show the reach-target rate as 100% and its rank and flagship-sunk values as "—".

#### Scenario: Cards for 2-5
- **WHEN** the target is Boss, compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the boss is O
- **THEN** once the boss route finishes, the cards list C-E-G-L-O at 28.0% with O marked as the boss, then C-E-G-L-N at 42.0% and C-D at 30.0%; only the boss card is simulated, and the other two say "not simulated"

#### Scenario: Cards for a node target on 2-5
- **WHEN** the target is E and compass predicts the same three routes
- **THEN** there are two cards: C-E at 70.0% with E marked as the target and labels such as "Reach E", and C-D at 30.0%, which says it does not reach E and is not simulated

#### Scenario: Card for a target already passed
- **WHEN** the target on 2-5 is E and a run is made with the fleet at G after passing C and E
- **THEN** there is one card, C-E at 100.0% with both nodes passed and E marked as the target, Reach E 100.0%, and a note that the target has been reached; the summary shows Reach E 100.0% and "—" for S, A, B and flagship sunk

#### Scenario: Most promising first
- **WHEN** route X (probability 0.6) finishes with S in 50% of its trials, and route Y (probability 0.2) with S in 90%
- **THEN** X's card (weighted S 30.0%) comes before Y's (18.0%)

#### Scenario: Tie on S
- **WHEN** two finished routes have the same weighted S, and route X has the higher weighted A or better
- **THEN** X's card comes first

#### Scenario: No confirmation
- **WHEN** route prediction succeeds
- **THEN** the cards appear and simulation of the routes that reach the target starts without any further user action

#### Scenario: Retreat rates under the nodes
- **WHEN** the route `B-C-E-F-O[Boss]` finishes with per-node reach rates 1.0, 0.893, 0.86, 0.713, 0.59
- **THEN** its stepper shows −10.7% under B, −3.3% under C, −14.7% under E and −12.3% under F, none under O, and no two of these labels overlap

#### Scenario: Results when the boss is reached
- **WHEN** a route reaches the target in 80% of its trials, gets S in 40% of all its trials, and sinks the enemy flagship there in 40% of all its trials
- **THEN** its card shows S 50.0% and flagship sunk 50.0%

#### Scenario: Individual ranks on a card
- **WHEN** the rank display is individual, and among trials that reached the target a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A 25.0% and B 12.5%

#### Scenario: Cumulative ranks on a card
- **WHEN** the rank display is cumulative, and among trials that reached the target a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A+ 75.0% and B+ 87.5%

#### Scenario: Order does not depend on the rank display
- **WHEN** the user switches the rank display while finished route cards are shown
- **THEN** the cards keep their order

#### Scenario: Results arrive per route
- **WHEN** 1 of 2 simulated routes has finished
- **THEN** that card shows its results, and the other card's results still show pending

### Requirement: Result footer
The panel SHALL have a footer, fixed at the bottom of the plugin area, with the run's status on its right (see Progress and cancel). From the start of route prediction and for as long as the run has routes, its left part SHALL name the following:
- the map;
- the fleet number;
- the snapshot time;
- the trials per route;
- the run's margin of error: ±(98 / √trials)%, to one decimal place, which is the worst-case 95% interval for a single route's rate;
- any branch and phase choices used, for example "F→J, H→I, O→P";
- the target, when it is a node, for example "Target E";
- "No night battle", when the Night battle switch was off.

When the selected fleet, map, choices, target, Night battle switch, or trial count no longer match the run's, the footer's result line, summary, and route cards SHALL be dimmed. The footer's result line SHALL then end with a marker whose tooltip says that the settings have changed since this result. The marker SHALL NOT take a line of its own, so the result line keeps its place whether or not the result is stale.

#### Scenario: Footer after a run
- **WHEN** fleet 1 finished a run on 7-5 with 2000 trials and choices F→J, H→I, O→P, target Boss, and Night battle on
- **THEN** the footer shows 7-5, fleet 1, the snapshot time, 2000 trials, ±2.2%, and "F→J, H→I, O→P", and names neither a target nor night battle

#### Scenario: Footer with a node target
- **WHEN** fleet 1 finished a run on 2-5 with target E and Night battle off
- **THEN** the footer also shows "Target E" and "No night battle"

#### Scenario: Stale result
- **WHEN** a run on 1-4 has finished and the user selects 1-5
- **THEN** the 1-4 results stay visible but dimmed, the footer's result line ends with the stale marker without moving or growing a line, and hovering over the marker says that the settings have changed

#### Scenario: Stale after a target change
- **WHEN** a run on 2-5 with the Boss target has finished and the user sets the target to E while Auto is off
- **THEN** the results stay visible but dimmed, and the footer's result line ends with the stale marker

#### Scenario: Stale and unobserved sortie together
- **WHEN** a mid-sortie result whose sortie was not observed from its start goes stale
- **THEN** the result line ends with both markers, the unobserved-sortie marker first, still on the one line

### Requirement: Normal-map fetch status in the footer
While a queue of normal-map fetches runs (startup, retry, or refresh; see battle-simulation), the panel SHALL show a small spinner at the far right of the footer, after the run's status. The marker SHALL NOT take a line of its own and SHALL NOT move the result line or the run's status. Hovering over the spinner SHALL show:
- that enemy data for the normal maps is being fetched, or refreshed for a refresh,
- how many maps are done out of the maps to fetch, for example "12 / 35",
- the map being fetched now, for example "3-2", or, during the pause between maps or while the queue waits for a run's fetch, the map it will fetch next.

The maps to fetch are, for the startup fetches, the normal maps not recorded as fetched when they begin; for a retry, the failed maps; and for a refresh, every normal map. A map counts as done once its fetch ends, whether it succeeded or failed, or when it is skipped because a run already fetched it.

When the queue ends with no map remembered as failed, the spinner SHALL disappear. When maps are remembered as failed, a small warning-colored download marker, distinct from the development-optimizer triangle, SHALL take the spinner's place. Hovering over the marker SHALL open a popover that stays open while the pointer is over it. It SHALL say how many maps were not fetched, list them, say which map the fetches stopped at and that kcnav may be refusing requests for now, and it SHALL have a Retry button. Pressing Retry SHALL start a retry (see battle-simulation), and the marker SHALL turn back into the spinner. The marker SHALL disappear once no map is remembered as failed.

Nothing SHALL appear when no queue runs and no map is remembered as failed, or when the plugin loads with nothing to fetch. The footer SHALL show the spinner or marker the same way whether or not a run is in progress, and a panel opened partway through SHALL show the current state at once.

#### Scenario: First load
- **WHEN** the plugin loads with no map recorded as fetched, and 1-1 to 3-1 are done
- **THEN** the footer shows the spinner at its far right, and hovering over it shows "12 / 35" and that 3-2 is being fetched

#### Scenario: Nothing to fetch
- **WHEN** the plugin loads with every normal map recorded as fetched
- **THEN** nothing appears at the right of the footer

#### Scenario: All maps fetched
- **WHEN** the last normal map's fetch ends and no map failed
- **THEN** the spinner disappears

#### Scenario: Some maps failed
- **WHEN** the startup fetches stop at 6-4, leaving 6-4 to 7-5 not fetched
- **THEN** a warning marker takes the spinner's place, and hovering over it opens a popover saying 7 maps were not fetched, listing 6-4 to 7-5, saying the fetches stopped at 6-4 and kcnav may be refusing requests for now, with a Retry button

#### Scenario: Retry
- **WHEN** 3-2 and 6-4 are remembered as failed, and the user presses Retry in the popover
- **THEN** the marker turns into the spinner, hovering shows "0 / 2" and that 3-2 is being fetched, and if both succeed the spinner then disappears

#### Scenario: Pause between maps
- **WHEN** 1-1 has been fetched and the queue is in its pause before 1-2
- **THEN** hovering over the spinner shows "1 / 35" and that 1-2 is next

#### Scenario: Next to a running simulation
- **WHEN** a run is simulating while a queue of normal-map fetches runs
- **THEN** the footer shows the run's status, with the spinner to its right

### Requirement: Summary result
Below the fleet display and above the route cards, the panel SHALL show a summary combining all routes, as defined by the battle-simulation weighted aggregate. It SHALL contain, in this order:
1. **S**, then A and B as set by the rank display (see Rank display setting) — **A** and **B** individually, or **A or better** and **B or better** cumulatively — at the target as the primary, most prominent values. These are probability-weighted over all trials, so they are the chance per sortie. Each SHALL show its rate when the target is reached as a smaller secondary value, for example "56.7% (96.0% when reached)".
2. The chance of reaching the target and the chance of sinking the enemy flagship there.

Its labels SHALL name the target as the route cards do: "Reach boss" and "Boss sunk" for the Boss target, "Reach E" and "E flagship sunk" for target E.

The summary SHALL NOT show a chance of losing a ship. It SHALL be shown whenever the result footer is, and every value in it SHALL read 0 until the routes are predicted and every simulated route has finished. All percentages in the summary and the route cards SHALL be shown to one decimal place.

#### Scenario: Summary after completion
- **WHEN** every simulated route has finished
- **THEN** the summary shows S and the two other rank values for the rank display, each with its rate when reached, followed by the reach-target and flagship-sunk rates

#### Scenario: Summary matches the table
- **WHEN** the target is Boss, there is a single `[Boss]` route at 28.0% with an S rate of 50.0% over its trials, and the other routes do not reach the boss
- **THEN** the summary shows S 14.0% with 50.0% when reached

#### Scenario: Summary in individual ranks
- **WHEN** the rank display is individual, the overall probabilities are S 0.4, A 0.2 and B 0.1, and the target is reached with probability 0.8
- **THEN** the summary shows S 40.0% (50.0% when reached), A 20.0% (25.0% when reached), and B 10.0% (12.5% when reached)

#### Scenario: Summary in cumulative ranks
- **WHEN** the rank display is cumulative, with the same probabilities
- **THEN** the summary shows S 40.0% (50.0% when reached), A or better 60.0% (75.0% when reached), and B or better 70.0% (87.5% when reached)

#### Scenario: Summary for a node target
- **WHEN** the target is E and the run has finished
- **THEN** the summary's labels read "Reach E" and "E flagship sunk", and its values are the rates at E

### Requirement: Errors are actionable
Every failure SHALL be shown in the panel with a short summary and expandable details. This covers an unusable fleet, a missing or corrupt binary, an incompatible optimizer schema, an optimizer error, and each cause of route prediction failure. After a route prediction failure, the panel SHALL offer a retry. A failure SHALL NOT leave the panel stuck in a running state.

#### Scenario: Compass unavailable
- **WHEN** route prediction fails because the compass page cannot be reached
- **THEN** the panel shows a "page unreachable" error with a Retry action, and no simulation runs

#### Scenario: Optimizer error
- **WHEN** the optimizer emits an `error` line
- **THEN** the panel shows its message with the error chain under details, and Simulate is enabled again

### Requirement: Narrow, top-down layout
poi's plugin area is narrow and tall, so the panel SHALL use a single column that fills the plugin area exactly, with no scrollbar for the panel as a whole. From top to bottom it SHALL contain:
1. the controls (see below);
2. the fleet display, which SHALL be collapsible;
3. the summary;
4. any error, then the route cards;
5. the footer: the result on the left, the run status on the right.

The controls SHALL have these rows, each wrapping within the panel's width when it doesn't fit:
1. on the left, the Fleet dropdown, the Map dropdown, and the Phase dropdown on maps that have one; the Plan mode / Sortie mode tag (see Mid-sortie runs) floating right. The Fleet dropdown's width SHALL be capped, a long fleet name cut short, so the row doesn't wrap for a long fleet name;
2. on the left, the branch choices after a "Route" (路線) label, on maps that have them (the label shows only then), then the Target dropdown and the Night battle switch, once the map's topology is cached (see Inputs), which SHALL wrap together. The row SHALL NOT be shown when it would be empty;
3. the action bar, holding:
   - on the left, the Reset button (see Selection reset), a minimal icon-only button, as it is rarely used. Hovering over it, also while it is disabled, SHALL show a tooltip naming it "Reset" and saying what it does;
   - floating right, the Auto switch (see Automatic runs). Hovering over it SHALL show a tooltip naming it "Auto", saying that it simulates when the fleet or the settings change, and that in sortie mode it simulates again at each node the fleet reaches, with the supplies used and the damage taken;
     then the Simulate button, which reads Cancel while a run is in progress (see Progress and cancel), keeping the same width for both labels. It SHALL be primary, except while Auto is on or a run is in progress.

   The action bar SHALL NOT wrap.

Only the mode tag and the action bar's Auto switch and Simulate button float right; every other control keeps to the left. The controls' buttons and dropdowns SHALL be 24px tall, 20% shorter than the default.

All but the fourth SHALL stay in place, the footer at the bottom of the plugin area. Only the fourth area SHALL scroll, vertically and on its own, when its content is taller than the room left.

The panel SHALL fit 400px wide without horizontal scrolling.

#### Scenario: Panel 400px wide
- **WHEN** the panel is 400px wide and shows a finished 4-2 run with 8 routes
- **THEN** every route card fits without scrolling sideways, and long routes wrap onto more lines rather than overflowing

#### Scenario: Only the routes scroll
- **WHEN** a finished run has more route cards than fit below the summary
- **THEN** the route cards scroll, while the controls bar, the fleet display, the summary and the footer stay in place, and the panel shows no outer scrollbar

#### Scenario: Controls on 7-5
- **WHEN** 7-5 is selected and its topology is cached
- **THEN** the first row shows the Fleet and Map dropdowns with the Plan mode tag at the right end; the second row shows "Route" with the F →, H → and O → choices, the Target dropdown and the Night battle switch, from the left, wrapping onto more lines where the panel is too narrow, with Target and Night battle on the same line; and the last row shows Reset at the left end and Auto and Simulate at the right end

#### Scenario: Controls on a map with a phase
- **WHEN** a map with a phase is selected
- **THEN** the Phase dropdown follows the Map dropdown on the first row, before the mode tag

#### Scenario: Controls before the topology is cached
- **WHEN** a map without branch choices is selected and its topology isn't cached yet
- **THEN** there is no Route / Target row: the fleet row is followed directly by the action bar

#### Scenario: Long fleet name
- **WHEN** the selected fleet has a long name and a map with a phase is selected, at 400px wide
- **THEN** the fleet name is cut short, and the Fleet, Map and Phase dropdowns and the mode tag stay on one line

#### Scenario: Reset tooltip
- **WHEN** the user hovers over the Reset icon, whether or not it is disabled
- **THEN** a tooltip shows "Reset" and that it clears the fleet and map

#### Scenario: Auto tooltip
- **WHEN** the user hovers over the Auto switch
- **THEN** a tooltip shows "Auto", that it simulates when the fleet or the settings change, and that in sortie mode it simulates again at each node, with the supplies used and the damage taken

#### Scenario: Simulate with Auto on
- **WHEN** Auto is on
- **THEN** the Simulate button is shown in the default color, not as primary, and still runs when clicked

#### Scenario: Fleet collapsed
- **WHEN** the user collapses the fleet display
- **THEN** only its header with the Live or Snapshot tag stays visible, and the route cards get the freed space

### Requirement: Localized text
All panel and settings-page text SHALL be available in Traditional Chinese, Japanese, and English, following poi's language setting.

#### Scenario: Japanese poi
- **WHEN** poi's language is set to Japanese
- **THEN** the panel's labels and messages are shown in Japanese

### Requirement: Rank display setting
The plugin SHALL have a poi config setting for how the summary and route cards show the A and B ranks: **individual**, each rank's own rate, or **cumulative**, A or better (S + A) and B or better (S + A + B). It SHALL default to individual, and any value other than these two SHALL be treated as individual. The plugin's settings page SHALL have a control for it. A change SHALL apply to the panel at once, including to results already shown, without re-running, restarting poi, or reopening the panel.

#### Scenario: Default
- **WHEN** the setting has never been changed
- **THEN** the summary and route cards show S, A and B individually

#### Scenario: Switching with results on screen
- **WHEN** a run has finished and the user sets the rank display to cumulative on the settings page
- **THEN** the summary and route cards show S, A or better and B or better for the same run, with no new run started

#### Scenario: Invalid value
- **WHEN** the config holds "both" for the rank display
- **THEN** the panel shows ranks individually

### Requirement: Refresh button on the settings page
The plugin's settings page SHALL have a button to refresh the enemy data of the normal maps (see battle-simulation), with a short note that it downloads every normal map again. While any queue of normal-map fetches runs, the button SHALL be disabled, and the note SHALL show the progress, for example "12 / 35". Pressing the button SHALL start the refresh at once, with no confirmation step. The progress then also shows in the panel's footer, and failures show there for a retry. If the optimizer cannot be resolved, pressing the button SHALL show that error on the settings page.

#### Scenario: Start a refresh
- **WHEN** no queue runs and the user presses the refresh button
- **THEN** the refresh starts, the button is disabled, the note shows "0 / 35", and the panel's footer shows the spinner

#### Scenario: Startup fetches running
- **WHEN** the user opens the settings page while the startup fetches are on their 12th of 35 maps
- **THEN** the refresh button is disabled and the note shows "11 / 35"

#### Scenario: Optimizer missing
- **WHEN** the optimizer binary is missing and the user presses the refresh button
- **THEN** no fetch starts, and the settings page shows the optimizer error

### Requirement: Selection reset
The control bar SHALL have a Reset button that clears the fleet and map selection, so the panel has nothing to simulate until the user picks both again. After a reset, the fleet and map selects SHALL each show an empty choice. Picking a fleet or a map fills in that select again. The empty choice SHALL only come from Reset; the user cannot pick it from the select's list.

Reset SHALL stop the panel's work: a run in progress is cancelled, a pending automatic run is dropped, and any result, error, or status on screen is cleared, as after Cancel. Reset SHALL stay usable while a run is in progress. It SHALL be disabled when neither a fleet nor a map is selected, and in sortie mode, where the fleet and map are locked to the sortie (see Sortie mode).

Reset SHALL set the target back to Boss and turn the Night battle switch back on. It SHALL NOT change the trial count, the Auto switch, or the remembered branch and phase choices of any map.

While the fleet or the map is not selected, unless the selected fleet is on a sortie:
- Simulate SHALL be disabled.
- No run SHALL start by itself: not on a change in game, not on a trial-count change, and not when the plugin comes into view.
- With no map selected, no branch or phase controls and no Target dropdown are shown.
- With no fleet selected, the fleet display SHALL show a hint to pick a fleet instead of a fleet. With a fleet but no map, it SHALL show the live fleet, with LoS at ×1.

A selected fleet on a sortie SHALL run in sortie mode as usual even with no map selected, since sortie mode uses the sortie's map whatever map is selected. Once the fleet is back in port, the map select SHALL be empty again and the rules above apply.

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
- **THEN** the settings page still shows Custom with 3000, the Auto switch is still off, and F → shows J

#### Scenario: Target and night battle cleared
- **WHEN** the target is H, the Night battle switch is off, and the user clicks Reset and then picks a fleet and 7-5
- **THEN** the Target dropdown shows Boss and the Night battle switch is on

#### Scenario: Cleared selection restored
- **WHEN** the user clicks Reset, closes poi, and opens it again
- **THEN** the panel opens with the fleet and map selects empty, and no run starts

#### Scenario: Reset locked in sortie mode
- **WHEN** fleet 1 is selected and is on a sortie
- **THEN** the Reset button is disabled

#### Scenario: Sortie with no map selected
- **WHEN** fleet 1 is selected with no map, the Auto switch is on, and fleet 1 sorties to 2-5 and reaches C
- **THEN** a run simulates 2-5 from C in sortie mode; once fleet 1 is back in port, the map select is empty again and no run starts
