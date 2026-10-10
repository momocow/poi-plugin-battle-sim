# simulator-panel Specification

## Purpose

The poi plugin panel where the user picks a fleet and a map, checks or edits the predicted routes, runs the simulation, and reads the results.

## Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3). It SHALL let the user set the number of trials, which defaults to 2000. Event maps SHALL NOT be offered. The last fleet, map, and trial count chosen SHALL be remembered between poi sessions.

When the selected map has player-selected branches or a phase, the panel SHALL show one control per choice, labeled with the node and its targets (for example "F → G / J") or as "Phase". Each control starts at compass's default choice. The choices SHALL be remembered per map between poi sessions. Maps without such choices SHALL show no extra controls. Choices SHALL NOT be editable while a run is in progress.

#### Scenario: Branch controls for 7-5
- **WHEN** the user selects 7-5
- **THEN** the panel shows three controls, F → G / J, H → I / K, and O → P / Q, set to G, I, and P unless the user changed them before

#### Scenario: No controls for 5-2
- **WHEN** the user selects 5-2
- **THEN** no branch or phase controls are shown

#### Scenario: Restored selection
- **WHEN** the user picked fleet 2 and 5-2, closes poi, and opens it again
- **THEN** the panel opens with fleet 2 and 5-2 selected

### Requirement: Fleet display
The panel SHALL show the fleet being simulated. Before a run, it SHALL show the selected fleet from live game state and update when that state changes. Once a run starts, it SHALL show the captured snapshot instead, labeled with the time it was taken, and it SHALL keep showing that snapshot through the results, even if the game state changes.

The display SHALL have:
- a summary row: fleet speed, fighter power, and line of sight (LoS) by Formula 33 at multiplier ×1. Hovering over the LoS value SHALL show the ×3 and ×4 values.
- one row per ship: ship name, level, and ship type.
- per ship, its equipment in slot order. Each item shows its icon and name, the improvement level as ★N when above 0, and an aircraft proficiency marker when proficiency is between 1 and 7. The expansion-slot item is shown after the main slots and visibly set apart. Empty slots are not shown.

Names SHALL follow poi's language setting.

#### Scenario: Live fleet before running
- **WHEN** the user selects fleet 2 and then swaps a piece of equipment in game
- **THEN** the panel shows fleet 2 with the new equipment, and the summary values update

#### Scenario: Snapshot during and after a run
- **WHEN** a run has started and the user then changes fleet 2 in game
- **THEN** the panel keeps showing the snapshot taken when the run started, with its capture time

#### Scenario: Improved and skilled equipment
- **WHEN** a ship carries a ★10 gun and a fighter with proficiency 7
- **THEN** the gun shows ★10, and the fighter shows the proficiency-7 marker

### Requirement: Progress and cancel
While routes are being predicted or simulated, the panel SHALL show which stage is running, and how many routes are finished out of the total. It SHALL offer a Cancel action. The Simulate action SHALL be disabled while a run is in progress. While the run waits for the map's enemy-data fetch, the panel SHALL say that enemy data is being fetched, until that fetch ends.

#### Scenario: Running
- **WHEN** 1 of 3 routes has finished
- **THEN** the panel shows "1 / 3" and an enabled Cancel button

#### Scenario: First run of a map
- **WHEN** a map is simulated for the first time
- **THEN** the status says enemy data is being fetched, and the message clears once the fetch ends

### Requirement: Route table
Once routes are predicted, the panel SHALL show them in a table, one row per candidate, ordered by probability with the highest first. Simulation SHALL start straight away, with no confirmation step. Each row SHALL contain:
- **Route**: the node letters after the start node, joined by `-`. When the last node is a boss node, `[Boss]` is appended to it, for example `A-B-C2-D[Boss]`.
- **Probability** of the route.
- **Simulation results** for the route: chance of reaching the boss, S rank, A rank, B rank or worse at the boss, chance of sinking the boss, and chance of losing at least one ship. These rates SHALL count all of the route's trials, including trials that retreated before the boss, so that each column weighted by Probability adds up to the summary.
- **Rank rates when the boss is reached**: for each of S, A, and B or worse, the rate among only the trials that reached the boss, shown next to the rate over all trials. The column headers SHALL say which is which, for example "S (all trials)" and "S (at boss)".

Result cells SHALL show that they are pending until that route's simulation finishes, and SHALL be filled in as each route completes. Rows for routes that do not reach the boss SHALL show their result cells as not simulated rather than as 0%.

#### Scenario: Table for 2-5
- **WHEN** compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the boss is O
- **THEN** the table lists `C-E-G-L-N` 42.0%, `C-D` 30.0%, and `C-E-G-L-O[Boss]` 28.0%; only the `[Boss]` row is simulated, and the other two show "not simulated"

#### Scenario: No confirmation
- **WHEN** route prediction succeeds
- **THEN** the table appears and simulation of the boss routes starts without any further user action

#### Scenario: Both rank rates per route
- **WHEN** a `[Boss]` route reaches the boss in 90% of trials and gets S rank in 80% of the trials that reach it
- **THEN** that row shows S (all trials) 72.0% and S (at boss) 80.0%

#### Scenario: Results arrive per route
- **WHEN** 1 of 2 simulated routes has finished
- **THEN** that row shows its results, and the other row's result cells still show pending

### Requirement: Summary result
Above the route table, the panel SHALL show a summary combining all routes as defined by the battle-simulation weighted aggregate: chance of reaching the boss, S rank, A rank, B rank or worse at the boss, chance of sinking the boss, and chance of losing at least one ship. For S, A, and B or worse, the summary SHALL show both the probability-weighted rate and the rate when the boss is reached, as defined in battle-simulation. The chance of losing at least one ship SHALL be labeled as covering only the simulated routes. The summary SHALL be shown only after every simulated route has finished. The summary SHALL also show the fleet snapshot time and the trial count per route. All percentages in the summary and the table SHALL be shown to one decimal place.

#### Scenario: Summary after completion
- **WHEN** every simulated route has finished
- **THEN** the summary shows the overall rates, the snapshot time, the trial count, and any branch and phase choices used (for example "F→J, H→I, O→P")

#### Scenario: Summary matches the table
- **WHEN** the table has a single `[Boss]` route at 28.0% with an S rate of 50.0%, and the other routes do not reach the boss
- **THEN** the summary shows S (all trials) 14.0% and S (at boss) 50.0%

### Requirement: Errors are actionable
Every failure SHALL be shown in the panel with a short summary and expandable details. This covers an unusable fleet, a missing or corrupt binary, an incompatible optimizer schema, an optimizer error, and each cause of route prediction failure. After a route prediction failure, the panel SHALL offer a retry. A failure SHALL NOT leave the panel stuck in a running state.

#### Scenario: Compass unavailable
- **WHEN** route prediction fails because the compass page cannot be reached
- **THEN** the panel shows a "page unreachable" error with a Retry action, and no simulation runs

#### Scenario: Optimizer error
- **WHEN** the optimizer emits an `error` line
- **THEN** the panel shows its message with the error chain under details, and Simulate is enabled again

### Requirement: Narrow, top-down layout
poi's plugin area is narrow and tall, so the panel SHALL use a single top-down column in this order: controls (fleet, map, branch and phase choices, trials, Simulate and Cancel), status, fleet display, summary, route table. The panel SHALL fit 400px wide without horizontal scrolling. The route table SHALL fit by putting each route's text on its own full-width line above that route's numbers, and by stacking each rank's rate at the boss under its all-trials rate in the same cell. The fleet display SHALL be collapsible so the results can be brought into view.

#### Scenario: Panel 400px wide
- **WHEN** the panel is 400px wide and shows a finished 4-2 run with 8 routes
- **THEN** every column of the route table is visible without scrolling sideways, and long routes wrap onto more lines rather than overflowing

#### Scenario: Fleet collapsed
- **WHEN** the user collapses the fleet display
- **THEN** only its header with the Live or Snapshot tag stays visible, and the summary moves up

### Requirement: Localized text
All panel and settings-page text SHALL be available in Traditional Chinese, Japanese, and English, following poi's language setting.

#### Scenario: Japanese poi
- **WHEN** poi's language is set to Japanese
- **THEN** the panel's labels and messages are shown in Japanese
