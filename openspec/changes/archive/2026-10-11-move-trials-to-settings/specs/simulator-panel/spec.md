## MODIFIED Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3). Event maps SHALL NOT be offered. The map options SHALL be grouped by world, each group labeled with the world number and its sea-area name from the game data (for example "1: 鎮守府海域"), or the number only when the game data is not loaded. In the open list, each map option SHALL show the map number and its name from the game data, for example "1-1 鎮守府正面海域"; the closed select SHALL show the map number only. Each fleet option SHALL show the fleet number and its in-game name, for example "1: 第一艦隊". When the game data is not loaded, the option SHALL show the number only.

The plugin's poi settings page, not the panel, SHALL let the user set the number of trials per route with these presets:
- Quick (500)
- Normal (2000), the default
- Precise (10000)
- Custom, which shows a number field accepting 1–100000

The trial count SHALL be a poi config setting. A count that matches a preset SHALL select that preset. Any other count SHALL select Custom with that count filled in. A value that is not a whole number of at least 1 SHALL be treated as 2000, and one above 100000 as 100000. A changed count SHALL apply to the open panel at once, as a change of the trial count (see Automatic runs and Result footer), without restarting poi or reopening the panel. The panel SHALL NOT show a trials control. The last fleet and map chosen SHALL be remembered between poi sessions.

When the selected map has player-selected branches or a phase, the panel SHALL show one control per choice, labeled with the node and an arrow (for example "F →"), its targets listed in the dropdown, or as "Phase". Each control starts at compass's default choice. The choices SHALL be remembered per map between poi sessions. Maps without such choices SHALL show no extra controls. Choices SHALL NOT be editable while a run is in progress.

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
- **One row per ship**, laid out after poi's fleet tab: level and ship type above the ship name, then current and maximum HP with morale, then the equipment.
  - HP SHALL be shown as `now / max` above a bar whose length is the HP ratio, colored by damage state as poi colors it:
    - no damage above 75% of maximum;
    - 小破 above 50% and at most 75%;
    - 中破 above 25% and at most 50%;
    - 大破 at most 25%.
  - Hovering over a damaged ship's HP SHALL name its damage state.
  - Morale SHALL be shown as its number with poi's colored square, in poi's bands (0–19, 20–29, 30–39, 40–48, 49, 50–52, 53 and above), so a sparkled ship shows a yellow square and an unchanged ship a white one.
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

### Requirement: Narrow, top-down layout
poi's plugin area is narrow and tall, so the panel SHALL use a single column that fills the plugin area exactly, with no scrollbar for the panel as a whole. From top to bottom it SHALL contain:
1. the controls bar: fleet, map, Simulate/Cancel and the Auto switch on the first row; and, for maps that have them, the branch and phase choices on a second;
2. the fleet display, which SHALL be collapsible;
3. the summary;
4. any error, then the route cards;
5. the footer: the result on the left, the run status on the right.

All but the fourth SHALL stay in place, the footer at the bottom of the plugin area. Only the fourth area SHALL scroll, vertically and on its own, when its content is taller than the room left.

The panel SHALL fit 400px wide without horizontal scrolling.

#### Scenario: Panel 400px wide
- **WHEN** the panel is 400px wide and shows a finished 4-2 run with 8 routes
- **THEN** every route card fits without scrolling sideways, and long routes wrap onto more lines rather than overflowing

#### Scenario: Only the routes scroll
- **WHEN** a finished run has more route cards than fit below the summary
- **THEN** the route cards scroll, while the controls bar, the fleet display, the summary and the footer stay in place, and the panel shows no outer scrollbar

#### Scenario: Fleet collapsed
- **WHEN** the user collapses the fleet display
- **THEN** only its header with the Live or Snapshot tag stays visible, and the route cards get the freed space
