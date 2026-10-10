## MODIFIED Requirements

### Requirement: Progress and cancel
While routes are being predicted or simulated, the panel SHALL show which stage is running, and how many routes are finished out of the total. It SHALL offer a Cancel action. The Simulate action SHALL be disabled while a run is in progress. While the run waits for the map's enemy-data fetch, the panel SHALL say that enemy data is being fetched, until that fetch ends.

#### Scenario: Running
- **WHEN** 1 of 3 routes has finished
- **THEN** the panel shows "1 / 3" and an enabled Cancel button

#### Scenario: First run of a map
- **WHEN** a map is simulated for the first time
- **THEN** the status says enemy data is being fetched, and the message clears once the fetch ends
