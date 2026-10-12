## ADDED Requirements

### Requirement: Data update prompt
When a newer version of the game-data package is available (see game-data-package, Periodic update check), the panel SHALL show an update icon at the far right of the footer, after the run's status. The icon SHALL NOT take a line of its own and SHALL NOT move the result line or the run's status. Hovering over it SHALL say that a data update is available, with the version in use and the available version.

The panel SHALL open the **update popup** by itself once per available version in a poi session: when the version is found, or, if the panel isn't in view or another popup is open, the next time the panel is in view with no other popup open. Clicking the icon SHALL open the popup at any time. The popup SHALL show the version in use and the available version, and have two buttons:
- **Update**: starts the update (see game-data-package, Update with the user's approval). While it downloads, the popup SHALL show progress and SHALL NOT be closable by Update again. When it succeeds, the popup SHALL say the new version is in use from the next run, the icon SHALL disappear, and the popup SHALL close after a moment or when the user closes it. When it fails, the popup SHALL say why and offer Update again;
- **Later**: closes the popup. The icon SHALL stay, and the popup SHALL NOT open by itself again for that version until poi restarts. A newer version found later SHALL open it again.

Closing the popup any other way SHALL count as Later. The prompt SHALL NOT start, cancel or delay a run, and a finished result SHALL NOT become stale because of it.

#### Scenario: Update found
- **WHEN** a check finds 1.4.0 available while the panel is in view and no popup is open
- **THEN** the footer shows the update icon, and the update popup opens with the version in use and 1.4.0, and Update and Later buttons

#### Scenario: Found while away
- **WHEN** a check finds 1.4.0 while another plugin's tab is shown
- **THEN** the popup opens when the user next brings the plugin into view

#### Scenario: Later
- **WHEN** the user clicks Later
- **THEN** the popup closes, the icon stays, and the popup doesn't open by itself again for 1.4.0 in this poi session

#### Scenario: Reopen from the icon
- **WHEN** the user clicked Later and then clicks the update icon
- **THEN** the update popup opens again

#### Scenario: Update succeeds
- **WHEN** the user clicks Update and 1.4.0 is downloaded and verified
- **THEN** the popup says 1.4.0 is in use from the next run, the icon disappears, and the new event's maps appear in the map list

#### Scenario: Update fails
- **WHEN** the download fails
- **THEN** the popup says the update failed and why, offers Update again, and the icon stays

### Requirement: Event state
When the shown map is an event map, the panel SHALL show, next to the Target dropdown, the event state the run simulates (see battle-simulation, Event state per run), as three selects:
- **Difficulty**: 丁, 丙, 乙, 甲;
- **Gauge**: the gauge numbers the map has, from the game-data package's event gauges, or only the game's current gauge when the package doesn't list them;
- **Gauge state**: Chip (消耗), Last dance (斬殺), Cleared (攻略済).

Each select's first option SHALL be **From game**, the default, naming the value read from poi's map info for the map, for example "From game (甲)":
- the difficulty is the one the player selected for the map;
- the gauge is the map's current gauge number;
- the gauge state is Cleared when the map is cleared. Otherwise it is Last dance when the gauge's remaining HP is at or below the package's last-dance threshold, and Chip when it is above. When the package has no threshold, it SHALL be shown as unknown, and the run uses no HP band.

Picking another option overrides the value for that map. Overrides SHALL be remembered per map between poi sessions, and Reset SHALL NOT change them. In sortie mode, the event state SHALL be read from the game and SHALL NOT be changeable, since the sortie is at the state the game is in.

When the difficulty is From game and the player has not selected one for the map, a run SHALL fail before any prediction with an error that asks to pick a difficulty.

A change of the event state, from the game or by an override, SHALL start a run as a qualifying change does under Automatic runs, and SHALL make a finished result stale. The footer's result line SHALL name the event state of an event-map run, for example "甲 G2 斬殺".

#### Scenario: State from the game
- **WHEN** the player selected 甲 on 62-3, its gauge 2 is at 3000 HP, and the package gives that gauge's last-dance threshold as 4800
- **THEN** the selects show From game (甲), From game (2) and From game (Last dance), and a run simulates 甲, gauge 2, last dance

#### Scenario: Override to plan another difficulty
- **WHEN** the user sets 62-3's difficulty to 乙
- **THEN** a run starts for 乙, the override stays after poi restarts, and 62-4 is not affected

#### Scenario: Difficulty not selected
- **WHEN** the player hasn't selected a difficulty on 62-4 and no override is set
- **THEN** a run fails with an error asking to pick a difficulty

#### Scenario: Gauge advances in game
- **WHEN** the event state is From game, and the player breaks 62-3's first gauge, so the game's current gauge becomes 2
- **THEN** a run starts for gauge 2

#### Scenario: Normal map
- **WHEN** the shown map is 5-5
- **THEN** no event state selects are shown

### Requirement: Game data version on the settings page
The plugin's settings page SHALL show the version of the game-data package in use (see game-data-package), and whether it is the version installed with the plugin or one installed by an update. It SHALL follow an update at once, without reopening the page. When no version is usable, it SHALL say the game data is not available.

#### Scenario: Bundled version
- **WHEN** the plugin uses the game data installed with it, version 1.0.0
- **THEN** the settings page shows "1.0.0, installed with the plugin"

#### Scenario: After an update
- **WHEN** the user approves the update to 1.0.1 while the settings page is open
- **THEN** the page shows "1.0.1, from an update"

## MODIFIED Requirements

### Requirement: Inputs
The panel SHALL let the user choose a fleet (1–4) and a map: a normal map (worlds 1–7, including their sub-maps such as 7-2/7-3), or a map of the current event, which is every map of an area numbered 21 or above in the game data. The map options SHALL be grouped by world, each group labeled with the world number and its sea-area name from the game data (for example "1: 鎮守府海域"), or the number only when the game data is not loaded. The event's maps SHALL come after world 7, as one group per event area, and each event map option SHALL also show its in-game number, for example "62-3 (E-3) …". When no event is running, the game data has no event area and no event group is shown. A remembered map that is no longer in the game data, such as a map of an event that has ended, SHALL be replaced by 1-1. Each map option SHALL show the map number and its name from the game data, for example "1-1 鎮守府正面海域", in the open list and in the closed select alike; the closed select SHALL be width-capped like the fleet select, truncating a long name with an ellipsis. Hovering the fleet or map select SHALL show a tooltip with the selection's full label, also while the select is locked. Each fleet option SHALL show the fleet number and its in-game name, for example "1: 第一艦隊". When the game data is not loaded, the option SHALL show the number only.

The plugin's poi settings page, not the panel, SHALL let the user set the number of trials per route with these presets:
- Quick (500)
- Normal (2000), the default
- Precise (10000)
- Custom, which shows a number field accepting 1–100000

The trial count SHALL be a poi config setting. A count that matches a preset SHALL select that preset. Any other count SHALL select Custom with that count filled in. A value that is not a whole number of at least 1 SHALL be treated as 2000, and one above 100000 as 100000. A changed count SHALL apply to the open panel at once, as a change of the trial count (see Automatic runs and Result footer), without restarting poi or reopening the panel. The panel SHALL NOT show a trials control. The last fleet and map chosen SHALL be remembered between poi sessions.

When the selected map has player-selected branches or a phase, the panel SHALL show one control per choice, labeled with the node and an arrow (for example "F →"), its targets listed in the dropdown, or as "Phase". Each control starts at compass's default choice. The choices SHALL be remembered per map between poi sessions. Maps without such choices SHALL show no extra controls. Choices SHALL NOT be editable while a run is in progress.

The panel SHALL have a **Target** dropdown that sets the node the sortie being planned ends at (see route-prediction, Target reach). Its first option is **Boss**, the default. Once compass has predicted the map in this poi session, the Boss option SHALL name the boss node, for example "Q (Boss)": the boss letters that the predicted candidates end at (narrowed to the sortie's path in sortie mode), or, when none ends at a boss, all of the map's boss letters, joined by "/". After it come the node letters on the candidates that compass last predicted for the map in this poi session, before any narrowing or cut, each once and in alphabetical order. The start node, the map's boss letters, and nodes without a battle are not listed. Whether a node has a battle SHALL be read from the map's topology data in the kcnav cache, as the optimizer reads it: a maelstrom, or a node that every route into it marks as a resource, empty or other pass-through node, has no battle; any other node, air raids included, has one. Before compass has predicted the map in this poi session, Boss is the only option. A remembered target that is not among the options SHALL still be shown and selected. There SHALL be one target, not one per map, and it SHALL be remembered between poi sessions. Selecting another map SHALL set it back to Boss. Entering or leaving sortie mode, which changes the map shown but not the map selected, SHALL NOT change the selected map's target.

The Target dropdown SHALL be shown only once the shown map's topology data is in the kcnav cache, which the map's shared enemy-data fetch writes (see battle-simulation). Until then, runs SHALL use the Boss target with the default node settings, whatever target is remembered, as when the panel had no target. The row SHALL appear without a new run or reopening the panel once the fetch has written the data. On a map's first run that happens during the run, while the row is not editable, so the first run of a map simulates the boss, and the user can change the target once its result is shown.

Whether the fleet pursues night battle is set per node, in the Node settings popup (see Node settings), not next to the Target dropdown.

The Target dropdown SHALL NOT be editable while a run is in progress. In sortie mode it SHALL stay editable, and it shows and sets the sortie's target (see Mid-sortie runs). In sortie mode the Target dropdown SHALL list only the nodes the fleet can still reach: those on the candidates narrowed to the sortie's path so far, from the node the fleet is at on. Nodes already passed, and nodes on routes the fleet can no longer take, are not listed.

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
- **THEN** no Target dropdown is shown at first, and the run uses the Boss target with the default node settings; once its result is shown, the user can pick a target

#### Scenario: Remembered target restored
- **WHEN** the user set the target to E on 2-5, closes poi, and opens it again
- **THEN** with 2-5 selected the Target dropdown shows E, even before the map is predicted, as the map's topology data is still in the kcnav cache

#### Scenario: Map change resets the target
- **WHEN** the user sets the target to E on 2-5, and then selects 1-1
- **THEN** the target is Boss, and selecting 2-5 again keeps it so

#### Scenario: Target kept into a sortie
- **WHEN** the selected map is 2-5 with the target E, and the selected fleet sorties to 2-5
- **THEN** the target stays E in sortie mode, and after the fleet returns to port

#### Scenario: Target in a sortie on another map
- **WHEN** the selected map is 1-5 with the target E, and the selected fleet sorties to 2-5
- **THEN** sortie mode starts at Boss, and after the fleet returns to port 1-5's target is E again

#### Scenario: Night-battle node target
- **WHEN** the target on 5-3 is P, a night-battle node
- **THEN** the footer of a run does not say "No night battle", whatever P's night battle setting

#### Scenario: Target options mid-sortie
- **WHEN** the fleet is at E on 2-5 after passing C, and the last prediction gave `1-C-D`, `1-C-E-G-L-N` and `1-C-E-G-L-O`
- **THEN** the Target dropdown offers Boss, E and L: C has been passed, D can no longer be reached, and G and N have no battle

#### Scenario: Night battle switch restored
- **WHEN** a user who had turned the Night battle switch off opens the panel after updating
- **THEN** no Night battle switch is shown next to the Target dropdown; night battle is set per node in Node settings

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

#### Scenario: Event running
- **WHEN** the game data has the event area 62 with maps 62-1 to 62-4
- **THEN** the map list shows, after world 7, a group for area 62 with 62-1 (E-1) to 62-4 (E-4), named from the game data

#### Scenario: Event over
- **WHEN** 62-3 was the remembered map and the event has ended, so the game data has no area 62
- **THEN** the panel opens with 1-1 selected and no event group

## REMOVED Requirements

### Requirement: Normal-map fetch status in the footer
**Reason**: The startup, retry and refresh queues of normal-map fetches are removed (see battle-simulation). The game-data package carries the normal maps' enemy data.
**Migration**: None needed from the user. A run's own fetch of data the package lacks still shows in the run's status (see Progress and cancel).

### Requirement: Refresh button on the settings page
**Reason**: A per-player refresh would put back the kcnav load this change removes. Newer enemy data now arrives with new game-data package versions.
**Migration**: None. Updates come through the game-data package's update prompt (see Data update prompt).
