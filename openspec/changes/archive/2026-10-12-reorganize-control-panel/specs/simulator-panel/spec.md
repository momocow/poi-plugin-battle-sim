## MODIFIED Requirements

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
