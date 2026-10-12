## ADDED Requirements

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
