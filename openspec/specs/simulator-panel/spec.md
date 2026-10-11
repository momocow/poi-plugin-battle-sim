# simulator-panel Specification

## Purpose

The poi plugin panel where the user picks a fleet and a map, checks or edits the predicted routes, runs the simulation, and reads the results.

## Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3). Event maps SHALL NOT be offered. The map options SHALL be grouped by world, each group labeled with the world number and its sea-area name from the game data (for example "1: 鎮守府海域"), or the number only when the game data is not loaded. In the open list, each map option SHALL show the map number and its name from the game data, for example "1-1 鎮守府正面海域"; the closed select SHALL show the map number only. Each fleet option SHALL show the fleet number and its in-game name, for example "1: 第一艦隊". When the game data is not loaded, the option SHALL show the number only.

The panel SHALL let the user set the number of trials per route with these presets:
- Quick (500)
- Normal (2000), the default
- Precise (10000)
- Custom, which shows a number field accepting 1–100000

A remembered trial count that matches a preset SHALL select that preset. Any other count SHALL select Custom with that count filled in. The last fleet, map, and trial count chosen SHALL be remembered between poi sessions.

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
- **THEN** the trials control shows Custom with 3000

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

### Requirement: Automatic runs
The panel SHALL start a run by itself, as if Simulate were clicked, when any of these changes while the panel is open:
- the selected fleet;
- a ship in the selected fleet: added, removed, moved, swapped or remodeled;
- equipment on a ship in the selected fleet: equipped, removed, moved between slots, or improved;
- the selected map;
- a branch or phase choice of the selected map;
- the trial count;
- the current HP of a ship in the selected fleet, up or down: for example damage in a sortie, between nodes or on returning, a docking that finishes, an instant repair, a repair ship's repair, or a modernization or marriage.

The panel SHALL also start a run by itself when the plugin comes into view while the panel has no run: none has started since the panel opened, or the last one was cancelled. The plugin comes into view when its tab becomes the one poi shows, whether the user selected it or poi's plugin auto switch brought it forward, and when the panel opens while its tab is already the one shown. In poi's double-tabbed layout, the plugin is in view when it is the plugin shown in the plugin pane. A panel with a run in progress, finished or failed SHALL NOT start a run on coming into view, even when that result is stale. Coming into view while the selected fleet does not qualify (see below) or while the Auto switch is off SHALL NOT start a run, then or later.

The run SHALL start once the inputs have stayed unchanged for the auto-run delay, so typing a custom trial count or a change made in several steps in game starts one run, with the final values. Each further change within the delay SHALL restart the wait.

The auto-run delay SHALL be a poi config setting in milliseconds, defaulting to 1000. A value that is not a whole number from 0 to 60000 SHALL be treated as the default. The plugin's poi settings page SHALL have a field for the delay. A changed delay SHALL apply from the next qualifying change, without restarting poi or reopening the panel.

It SHALL do so only when every ship present in the selected fleet has all its main slots filled, counting only the slots that ship has. The expansion slot SHALL NOT count, and the fleet need not be full: a fleet of three ships with every main slot filled qualifies. A fleet with no ships SHALL NOT start a run.

The control bar SHALL have an Auto switch, next to the Simulate button, that turns automatic runs on or off. It SHALL be on by default and SHALL be remembered between poi sessions. While it is off, no run starts by itself, and turning it on SHALL NOT start a run for changes made while it was off. The switch SHALL stay usable while a run is in progress; turning it off does not cancel that run.

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

#### Scenario: Change during a run
- **WHEN** a run is in progress and the user swaps equipment on a ship in the selected fleet, leaving every main slot filled
- **THEN** that run is cancelled and a new one starts with the changed fleet

#### Scenario: Sortie return
- **WHEN** the selected fleet returns from a sortie with lower HP and morale, no ship or equipment changed, and every main slot is filled
- **THEN** a run starts with the damaged HP

#### Scenario: Between nodes
- **WHEN** a run is in progress and the selected fleet advances to the next node of a sortie with lower HP
- **THEN** that run is cancelled, and a new one starts after the delay with the HP after the battle

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

### Requirement: Auto focus
poi SHALL switch to the plugin's tab when the player enters the remodel screen, and when a ship or its equipment is changed in game: a ship placed in, removed from or moved within a fleet, a fleet preset loaded, a ship remodeled or modernized, equipment equipped, removed, or moved between slots or ships, or an expansion slot opened. This applies to any fleet, not only the selected one.

The plugin SHALL declare these requests to poi's plugin auto switch rather than switch tabs itself, so the on/off checkbox is poi's "Enable auto switch" setting for this plugin, on by default and remembered by poi. poi's global auto-switch setting also applies.

#### Scenario: Equipment swapped
- **WHEN** auto switch is on, poi shows another tab, and the user swaps a gun on any ship
- **THEN** poi switches to the plugin's tab

#### Scenario: Auto switch off
- **WHEN** the user unchecks "Enable auto switch" for this plugin and enters the remodel screen
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
Once routes are predicted, the panel SHALL show one card per route candidate. The cards SHALL put the most promising route first. Finished routes SHALL come first, ordered by their weighted S rate (route probability times S over all of the route's trials), highest first; when equal, by weighted A or better; when still equal, by weighted B or better. Then come routes still being simulated, then routes that do not reach the boss. Ties, and the order within the last two groups, SHALL go by probability, highest first. Simulation SHALL start straight away, with no confirmation step. Each card SHALL have three parts, left to right:
- **Route probability and reach boss**: the route's probability, and its chance of reaching the boss over all of its trials, each as a labeled percentage. Reach boss shows "—" until the route has a result and for routes that do not reach the boss.
- **Route** as a stepper: one circle per node after the start node, labeled with its letter and joined by a track, with the boss node marked when the route ends at the boss. Hovering over the stepper shows the route text: the node letters joined by `-`, with `[Boss]` appended when the last node is a boss node, for example `A-B-C2-D[Boss]`. Under each node where some trials turned back, its **retreat rate** is shown, for example "−10.7%". Nodes with no retreats show none. Neighboring rates SHALL NOT overlap.
- **Boss results** among trials that reached the boss: S, A or better, B or better, and boss sunk.

Apart from reach boss, the cards SHALL NOT show rates over all of a route's trials; those appear, probability-weighted, in the summary.

A card's results SHALL show that they are pending until that route's simulation finishes. They SHALL be filled in as each route completes. Cards for routes that do not reach the boss SHALL say they are not simulated, rather than showing 0%.

#### Scenario: Cards for 2-5
- **WHEN** compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the boss is O
- **THEN** once the boss route finishes, the cards list C-E-G-L-O at 28.0% with O marked as the boss, then C-E-G-L-N at 42.0% and C-D at 30.0%; only the boss card is simulated, and the other two say "not simulated"

#### Scenario: Most promising first
- **WHEN** route X (probability 0.6) finishes with S in 50% of its trials, and route Y (probability 0.2) with S in 90%
- **THEN** X's card (weighted S 30.0%) comes before Y's (18.0%)

#### Scenario: Tie on S
- **WHEN** two finished routes have the same weighted S, and route X has the higher weighted A or better
- **THEN** X's card comes first

#### Scenario: No confirmation
- **WHEN** route prediction succeeds
- **THEN** the cards appear and simulation of the boss routes starts without any further user action

#### Scenario: Retreat rates under the nodes
- **WHEN** the route `B-C-E-F-O[Boss]` finishes with per-node reach rates 1.0, 0.893, 0.86, 0.713, 0.59
- **THEN** its stepper shows −10.7% under B, −3.3% under C, −14.7% under E and −12.3% under F, none under O, and no two of these labels overlap

#### Scenario: Results when the boss is reached
- **WHEN** a route reaches the boss in 80% of its trials, gets S in 40% of all its trials, and sinks the boss in 40% of all its trials
- **THEN** its card shows S 50.0% and boss sunk 50.0%

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
- any branch and phase choices used, for example "F→J, H→I, O→P".

When the selected fleet, map, choices, or trial count no longer match the run's, the footer's result line, summary, and route cards SHALL be dimmed. The footer SHALL then note that the settings have changed since this result.

#### Scenario: Footer after a run
- **WHEN** fleet 1 finished a run on 7-5 with 2000 trials and choices F→J, H→I, O→P
- **THEN** the footer shows 7-5, fleet 1, the snapshot time, 2000 trials, ±2.2%, and "F→J, H→I, O→P"

#### Scenario: Stale result
- **WHEN** a run on 1-4 has finished and the user selects 1-5
- **THEN** the 1-4 results stay visible but dimmed, with a note that the settings have changed

### Requirement: Summary result
Below the fleet display and above the route cards, the panel SHALL show a summary combining all routes, as defined by the battle-simulation weighted aggregate. It SHALL contain, in this order:
1. **S**, **A or better**, and **B or better** as the primary, most prominent values. These are probability-weighted over all trials, so they are the chance per sortie. Each SHALL show its rate when the boss is reached as a smaller secondary value, for example "56.7% (96.0% when reached)".
2. The chance of reaching the boss and the chance of sinking the boss.

The summary SHALL NOT show a chance of losing a ship. It SHALL be shown whenever the result footer is, and every value in it SHALL read 0 until the routes are predicted and every simulated route has finished. All percentages in the summary and the route cards SHALL be shown to one decimal place.

#### Scenario: Summary after completion
- **WHEN** every simulated route has finished
- **THEN** the summary shows S, A or better, and B or better, each with its rate when reached, followed by the reach-boss and boss-sunk rates

#### Scenario: Summary matches the table
- **WHEN** there is a single `[Boss]` route at 28.0% with an S rate of 50.0% over its trials, and the other routes do not reach the boss
- **THEN** the summary shows S 14.0% with 50.0% when reached

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
1. the controls bar: fleet, map, Simulate/Cancel and the Auto switch on the first row; trials (with the custom count field) on the second; and, for maps that have them, the branch and phase choices on a third;
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

### Requirement: Localized text
All panel and settings-page text SHALL be available in Traditional Chinese, Japanese, and English, following poi's language setting.

#### Scenario: Japanese poi
- **WHEN** poi's language is set to Japanese
- **THEN** the panel's labels and messages are shown in Japanese
