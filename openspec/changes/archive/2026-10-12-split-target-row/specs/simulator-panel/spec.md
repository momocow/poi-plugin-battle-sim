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
2. on the left, the branch choices after an "Active branching" (能動分歧) label. The row SHALL be shown only on maps that have branch choices;
3. on the left, the Target dropdown, the Night battle switch and the Formations button (see Node formations), which SHALL wrap together. The row SHALL be shown only once the shown map's topology is cached (see Inputs);
4. the action bar, holding:
   - on the left, the Reset button (see Selection reset), a minimal icon-only button, as it is rarely used. Hovering over it, also while it is disabled, SHALL show a tooltip naming it "Reset" and saying what it does;
   - floating right, the Auto switch (see Automatic runs). Hovering over it SHALL show a tooltip naming it "Auto", saying that it simulates when the fleet or the settings change, and that in sortie mode it simulates again at each node the fleet reaches, with the supplies used and the damage taken;
     then the Simulate button, which reads Cancel while a run is in progress (see Progress and cancel), keeping the same width for both labels. It SHALL be primary, except while Auto is on or a run is in progress.

   The action bar SHALL NOT wrap.

Only the mode tag and the action bar's Auto switch and Simulate button float right; every other control keeps to the left. The controls' buttons and dropdowns SHALL be 24px tall, 20% shorter than the default.

All but the fourth area SHALL stay in place, the footer at the bottom of the plugin area. Only the fourth area SHALL scroll, vertically and on its own, when its content is taller than the room left.

The panel SHALL fit 400px wide without horizontal scrolling.

#### Scenario: Panel 400px wide
- **WHEN** the panel is 400px wide and shows a finished 4-2 run with 8 routes
- **THEN** every route card fits without scrolling sideways, and long routes wrap onto more lines rather than overflowing

#### Scenario: Only the routes scroll
- **WHEN** a finished run has more route cards than fit below the summary
- **THEN** the route cards scroll, while the controls bar, the fleet display, the summary and the footer stay in place, and the panel shows no outer scrollbar

#### Scenario: Controls on 7-5
- **WHEN** 7-5 is selected and its topology is cached
- **THEN** the first row shows the Fleet and Map dropdowns with the Plan mode tag at the right end; the second row shows "Active branching" with the F →, H → and O → choices from the left; the third row shows the Target dropdown, the Night battle switch and the Formations button from the left; and the last row shows Reset at the left end and Auto and Simulate at the right end

#### Scenario: Controls on a map without branch choices
- **WHEN** 2-5, which has no branch choices, is selected and its topology is cached
- **THEN** the fleet row is followed by the Target row, then the action bar; there is no "Active branching" label

#### Scenario: Controls on a map with a phase
- **WHEN** a map with a phase is selected
- **THEN** the Phase dropdown follows the Map dropdown on the first row, before the mode tag

#### Scenario: Controls before the topology is cached
- **WHEN** a map without branch choices is selected and its topology isn't cached yet
- **THEN** there is neither a branch row nor a Target row: the fleet row is followed directly by the action bar

#### Scenario: Branches before the topology is cached
- **WHEN** 7-5 is selected and its topology isn't cached yet
- **THEN** the branch row is shown, and there is no Target row

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
