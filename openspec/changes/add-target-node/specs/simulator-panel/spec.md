## MODIFIED Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3). Event maps SHALL NOT be offered. The map options SHALL be grouped by world, each group labeled with the world number and its sea-area name from the game data (for example "1: 鎮守府海域"), or the number only when the game data is not loaded. In the open list, each map option SHALL show the map number and its name from the game data, for example "1-1 鎮守府正面海域"; the closed select SHALL show the map number only. Each fleet option SHALL show the fleet number and its in-game name, for example "1: 第一艦隊". When the game data is not loaded, the option SHALL show the number only.

The panel SHALL let the user set the number of trials per route with these presets:
- Quick (500)
- Normal (2000), the default
- Precise (10000)
- Custom, which shows a number field accepting 1–100000

A remembered trial count that matches a preset SHALL select that preset. Any other count SHALL select Custom with that count filled in. The last fleet, map, and trial count chosen SHALL be remembered between poi sessions.

When the selected map has player-selected branches or a phase, the panel SHALL show one control per choice, labeled with the node and an arrow (for example "F →"), its targets listed in the dropdown, or as "Phase". Each control starts at compass's default choice. The choices SHALL be remembered per map between poi sessions. Maps without such choices SHALL show no extra controls. Choices SHALL NOT be editable while a run is in progress.

The panel SHALL have a **Target** dropdown for every map that sets the node a sortie ends at (see route-prediction, Target reach). Its first option is **Boss**, the default. After it come the node letters on the candidates that compass last predicted for the selected map in this poi session, before any cut, each once and in alphabetical order. The start node and the map's boss letters are not listed. Before compass has predicted the map in this poi session, Boss is the only option. A remembered target that is not among the options SHALL still be shown and selected. The target SHALL be remembered per map between poi sessions.

Next to the Target dropdown, the panel SHALL have a **Night battle** switch that sets whether the fleet pursues night battle at the target. It SHALL be on by default and SHALL be remembered between poi sessions. It applies to every map.

The Target dropdown and the Night battle switch SHALL NOT be editable while a run is in progress.

#### Scenario: Target options after a prediction
- **WHEN** the selected map is 2-5, whose boss is O, and the last prediction this session gave `1-C-D`, `1-C-E-G-L-N` and `1-C-E-G-L-O`
- **THEN** the Target dropdown offers Boss, C, D, E, G, L and N

#### Scenario: Target before any prediction
- **WHEN** poi has just started and the selected map has not been predicted yet, and no target is remembered for it
- **THEN** the Target dropdown offers Boss only, and Boss is selected

#### Scenario: Remembered target restored
- **WHEN** the user set the 2-5 target to E, closes poi, and opens it again
- **THEN** with 2-5 selected the Target dropdown shows E, even before the map is predicted

#### Scenario: Target per map
- **WHEN** the user sets the 2-5 target to E and then selects 1-1
- **THEN** the 1-1 target is Boss, unless the user set another target for 1-1 before

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
- **THEN** the trials control shows Custom with 3000

### Requirement: Automatic runs
The panel SHALL start a run by itself, as if Simulate were clicked, when any of these changes while the panel is open:
- the selected fleet;
- a ship in the selected fleet: added, removed, moved, swapped or remodeled;
- equipment on a ship in the selected fleet: equipped, removed, moved between slots, or improved;
- the selected map;
- a branch or phase choice of the selected map;
- the target of the selected map;
- the Night battle switch;
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

### Requirement: Route cards
Once routes are predicted, the panel SHALL show one card per route candidate, after any cut and merge for a node target (see route-prediction, Target reach). The cards SHALL put the most promising route first. Finished routes SHALL come first, ordered by their weighted S rate (route probability times S over all of the route's trials), highest first; when equal, by weighted A or better; when still equal, by weighted B or better. Then come routes still being simulated, then routes that do not reach the target. Ties, and the order within the last two groups, SHALL go by probability, highest first. Simulation SHALL start straight away, with no confirmation step. Each card SHALL have three parts, left to right:
- **Route probability and reach target**: the route's probability, and its chance of reaching the target over all of its trials, each as a labeled percentage. Reach target shows "—" until the route has a result and for routes that do not reach the target.
- **Route** as a stepper: one circle per node after the start node, labeled with its letter and joined by a track, with the last node marked as the target when the route reaches the target, as the boss for the Boss target. Hovering over the stepper shows the route text: the node letters joined by `-`, with `[Boss]` appended when the last node is a boss node, for example `A-B-C2-D[Boss]`. Under each node where some trials turned back, its **retreat rate** is shown, for example "−10.7%". Nodes with no retreats show none. Neighboring rates SHALL NOT overlap.
- **Target results** among trials that reached the target: S, A or better, B or better, and flagship sunk.

Apart from reach target, the cards SHALL NOT show rates over all of a route's trials; those appear, probability-weighted, in the summary.

Labels that name the target SHALL say "boss" for the Boss target, for example "Reach boss" and "Boss sunk", and SHALL name the node for a node target, for example "Reach E" and "E flagship sunk".

A card's results SHALL show that they are pending until that route's simulation finishes. They SHALL be filled in as each route completes. Cards for routes that do not reach the target SHALL say they are not simulated, rather than showing 0%.

#### Scenario: Cards for 2-5
- **WHEN** the target is Boss, compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the boss is O
- **THEN** once the boss route finishes, the cards list C-E-G-L-O at 28.0% with O marked as the boss, then C-E-G-L-N at 42.0% and C-D at 30.0%; only the boss card is simulated, and the other two say "not simulated"

#### Scenario: Cards for a node target on 2-5
- **WHEN** the target is E and compass predicts the same three routes
- **THEN** there are two cards: C-E at 70.0% with E marked as the target and labels such as "Reach E", and C-D at 30.0%, which says it does not reach E and is not simulated

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
- **WHEN** a route reaches the target in 80% of its trials, gets S in 40% of all its trials, and sinks the flagship there in 40% of all its trials
- **THEN** its card shows S 50.0% and flagship sunk 50.0%

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

When the selected fleet, map, choices, target, Night battle switch, or trial count no longer match the run's, the footer's result line, summary, and route cards SHALL be dimmed. The footer SHALL then note that the settings have changed since this result.

#### Scenario: Footer after a run
- **WHEN** fleet 1 finished a run on 7-5 with 2000 trials and choices F→J, H→I, O→P, target Boss, and Night battle on
- **THEN** the footer shows 7-5, fleet 1, the snapshot time, 2000 trials, ±2.2%, and "F→J, H→I, O→P", and names neither a target nor night battle

#### Scenario: Footer with a node target
- **WHEN** fleet 1 finished a run on 2-5 with target E and Night battle off
- **THEN** the footer also shows "Target E" and "No night battle"

#### Scenario: Stale result
- **WHEN** a run on 1-4 has finished and the user selects 1-5
- **THEN** the 1-4 results stay visible but dimmed, with a note that the settings have changed

#### Scenario: Stale after a target change
- **WHEN** a run on 2-5 with the Boss target has finished and the user sets the target to E while Auto is off
- **THEN** the results stay visible but dimmed, with a note that the settings have changed

### Requirement: Summary result
Below the fleet display and above the route cards, the panel SHALL show a summary combining all routes, as defined by the battle-simulation weighted aggregate. It SHALL contain, in this order:
1. **S**, **A or better**, and **B or better** at the target as the primary, most prominent values. These are probability-weighted over all trials, so they are the chance per sortie. Each SHALL show its rate when the target is reached as a smaller secondary value, for example "56.7% (96.0% when reached)".
2. The chance of reaching the target and the chance of sinking the enemy flagship there.

Its labels SHALL name the target as the route cards do: "Reach boss" and "Boss sunk" for the Boss target, "Reach E" and "E flagship sunk" for target E.

The summary SHALL NOT show a chance of losing a ship. It SHALL be shown whenever the result footer is, and every value in it SHALL read 0 until the routes are predicted and every simulated route has finished. All percentages in the summary and the route cards SHALL be shown to one decimal place.

#### Scenario: Summary after completion
- **WHEN** every simulated route has finished
- **THEN** the summary shows S, A or better, and B or better, each with its rate when reached, followed by the reach-target and flagship-sunk rates

#### Scenario: Summary matches the table
- **WHEN** there is a single `[Boss]` route at 28.0% with an S rate of 50.0% over its trials, and the other routes do not reach the boss
- **THEN** the summary shows S 14.0% with 50.0% when reached

#### Scenario: Summary for a node target
- **WHEN** the target is E and the run has finished
- **THEN** the summary's labels read "Reach E" and "E flagship sunk", and its values are the rates at E
