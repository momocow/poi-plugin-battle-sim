## MODIFIED Requirements

### Requirement: Route cards
Once routes are predicted, the panel SHALL show one card per route candidate. The cards SHALL put the most promising route first. Finished routes SHALL come first, ordered by their weighted S rate (route probability times S over all of the route's trials), highest first; when equal, by weighted A or better; when still equal, by weighted B or better. Then come routes still being simulated, then routes that do not reach the boss. Ties, and the order within the last two groups, SHALL go by probability, highest first. Simulation SHALL start straight away, with no confirmation step. Each card SHALL have three parts, left to right:
- **Route probability and reach boss**: the route's probability, and its chance of reaching the boss over all of its trials, each as a labeled percentage. Reach boss shows "—" until the route has a result and for routes that do not reach the boss.
- **Route** as a stepper: one circle per node after the start node, labeled with its letter and joined by a track, with the boss node marked when the route ends at the boss. Hovering over the stepper shows the route text: the node letters joined by `-`, with `[Boss]` appended when the last node is a boss node, for example `A-B-C2-D[Boss]`. Under each node where some trials turned back, its **retreat rate** is shown, for example "−10.7%". Nodes with no retreats show none. Neighboring rates SHALL NOT overlap.
- **Boss results** among trials that reached the boss: S, then A and B as set by the rank display (see Rank display setting) — individually, labeled `A` and `B`, or cumulatively, labeled `A+` and `B+` for A or better and B or better — and boss sunk.

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

#### Scenario: Individual ranks on a card
- **WHEN** the rank display is individual, and among trials that reached the boss a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A 25.0% and B 12.5%

#### Scenario: Cumulative ranks on a card
- **WHEN** the rank display is cumulative, and among trials that reached the boss a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A+ 75.0% and B+ 87.5%

#### Scenario: Order does not depend on the rank display
- **WHEN** the user switches the rank display while finished route cards are shown
- **THEN** the cards keep their order

#### Scenario: Results arrive per route
- **WHEN** 1 of 2 simulated routes has finished
- **THEN** that card shows its results, and the other card's results still show pending

### Requirement: Summary result
Below the fleet display and above the route cards, the panel SHALL show a summary combining all routes, as defined by the battle-simulation weighted aggregate. It SHALL contain, in this order:
1. **S**, then A and B as set by the rank display (see Rank display setting) — **A** and **B** individually, or **A or better** and **B or better** cumulatively — as the primary, most prominent values. These are probability-weighted over all trials, so they are the chance per sortie. Each SHALL show its rate when the boss is reached as a smaller secondary value, for example "56.7% (96.0% when reached)".
2. The chance of reaching the boss and the chance of sinking the boss.

The summary SHALL NOT show a chance of losing a ship. It SHALL be shown whenever the result footer is, and every value in it SHALL read 0 until the routes are predicted and every simulated route has finished. All percentages in the summary and the route cards SHALL be shown to one decimal place.

#### Scenario: Summary after completion
- **WHEN** every simulated route has finished
- **THEN** the summary shows S and the two other rank values for the rank display, each with its rate when reached, followed by the reach-boss and boss-sunk rates

#### Scenario: Summary matches the table
- **WHEN** there is a single `[Boss]` route at 28.0% with an S rate of 50.0% over its trials, and the other routes do not reach the boss
- **THEN** the summary shows S 14.0% with 50.0% when reached

#### Scenario: Summary in individual ranks
- **WHEN** the rank display is individual, the overall probabilities are S 0.4, A 0.2 and B 0.1, and the boss is reached with probability 0.8
- **THEN** the summary shows S 40.0% (50.0% when reached), A 20.0% (25.0% when reached), and B 10.0% (12.5% when reached)

#### Scenario: Summary in cumulative ranks
- **WHEN** the rank display is cumulative, with the same probabilities
- **THEN** the summary shows S 40.0% (50.0% when reached), A or better 60.0% (75.0% when reached), and B or better 70.0% (87.5% when reached)

## ADDED Requirements

### Requirement: Rank display setting
The plugin SHALL have a poi config setting for how the summary and route cards show the A and B ranks: **individual**, each rank's own rate, or **cumulative**, A or better (S + A) and B or better (S + A + B). It SHALL default to individual, and any value other than these two SHALL be treated as individual. The plugin's settings page SHALL have a control for it. A change SHALL apply to the panel at once, including to results already shown, without re-running, restarting poi, or reopening the panel.

#### Scenario: Default
- **WHEN** the setting has never been changed
- **THEN** the summary and route cards show S, A and B individually

#### Scenario: Switching with results on screen
- **WHEN** a run has finished and the user sets the rank display to cumulative on the settings page
- **THEN** the summary and route cards show S, A or better and B or better for the same run, with no new run started

#### Scenario: Invalid value
- **WHEN** the config holds "both" for the rank display
- **THEN** the panel shows ranks individually
