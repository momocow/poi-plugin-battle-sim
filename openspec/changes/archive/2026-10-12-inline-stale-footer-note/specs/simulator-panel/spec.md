## MODIFIED Requirements

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
