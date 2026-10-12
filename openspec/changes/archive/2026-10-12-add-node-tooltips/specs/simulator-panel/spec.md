## MODIFIED Requirements

### Requirement: Route cards
Once routes are predicted, the panel SHALL show one card per route candidate, after any cut and merge for a node target (see route-prediction, Target reach). The cards SHALL put the most promising route first. Finished routes SHALL come first, ordered by their weighted S rate (route probability times S over all of the route's trials), highest first; when equal, by weighted A or better; when still equal, by weighted B or better. Then come routes still being simulated, then routes that do not reach the target. Ties, and the order within the last two groups, SHALL go by probability, highest first. Simulation SHALL start straight away, with no confirmation step. Each card SHALL have three parts, left to right:
- **Route probability and reach target**: the route's probability, and its chance of reaching the target over all of its trials, each as a labeled percentage. Reach target shows "—" until the route has a result and for routes that do not reach the target.
- **Route** as a stepper: one circle per node after the start node, labeled with its letter and joined by a track, with the last node marked as the target when the route reaches the target, as the boss for the Boss target. Hovering over the stepper shows the route text: the node letters joined by `-`, with `[Boss]` appended when the last node is a boss node, for example `A-B-C2-D[Boss]`. Under each node where some trials turned back, its **retreat rate** is shown, for example "−10.7%". Nodes with no retreats show none. Neighboring rates SHALL NOT overlap.

Once a route's simulation has finished, hovering over any node on the simulated part of its stepper SHALL show a tooltip for that node on that route, in place of the route text. Every tooltip SHALL start with the node's **type**. For a node with a battle it SHALL then show:
- the **reach rate** to that node: the share of the route's trials that reached it (see battle-simulation, Reach rate per node), as a percentage;
- the **formation** the fleet fought in there: the run's formation for the node after the ship-count rule (see Node settings), by its name, for example 複縦陣;
- the **special attack** that can fire there (see battle-simulation, Special attack per node), by its name, for example "Nelson Touch", or that none can;
- **S**, then A and B as set by the rank display (see Rank display setting), labeled as on the card, among the trials that fought at that node, each as a percentage. Where no trial fought there they SHALL read "—".

A battle node's type SHALL follow the rule for its default formation (see battle-simulation, Player formation per node), the first that applies: **Submarines only**, **Submarines mixed**, **Night battle**, **Air raid** (most edges into it have color 10), **Air battle** (color 7), else **Normal battle**. When the run did not know the map's topology data, it SHALL show "—".

A node without a battle SHALL show its type, **Maelstrom** or **No battle** (resources, empty and other pass-through nodes), as the optimizer reports it, and then its reach rate.

Nodes already passed mid-sortie, and nodes on a card that is pending or not simulated, SHALL show no tooltip. The tooltip SHALL follow the run, not the settings changed since; a change of rank display SHALL apply to it at once.
- **Target results** among trials that reached the target: S, then A and B as set by the rank display (see Rank display setting) — individually, labeled `A` and `B`, or cumulatively, labeled `A+` and `B+` for A or better and B or better — and flagship sunk.

Apart from reach target, the cards SHALL NOT show rates over all of a route's trials; those appear, probability-weighted, in the summary.

Labels that name the target SHALL say "boss" for the Boss target, for example "Reach boss" and "Boss sunk", and SHALL name the node for a node target, for example "Reach E" and "E flagship sunk". They SHALL follow the run's target, not the target selected since.

A card's results SHALL show that they are pending until that route's simulation finishes. They SHALL be filled in as each route completes. Cards for routes that do not reach the target SHALL say they are not simulated, rather than showing 0%; for a node target they SHALL say that the route does not reach that node.

Mid-sortie, a route that has passed the target (see route-prediction) SHALL show its nodes up to the target, all as passed, with the target marked; its reach target SHALL read 100%, and in place of the results it SHALL say that the target has been reached. The summary SHALL then show the reach-target rate as 100% and its rank and flagship-sunk values as "—".

#### Scenario: Cards for 2-5
- **WHEN** the target is Boss, compass predicts `1-C-D` at 0.3, `1-C-E-G-L-N` at 0.42, and `1-C-E-G-L-O` at 0.28, and the boss is O
- **THEN** once the boss route finishes, the cards list C-E-G-L-O at 28.0% with O marked as the boss, then C-E-G-L-N at 42.0% and C-D at 30.0%; only the boss card is simulated, and the other two say "not simulated"

#### Scenario: Cards for a node target on 2-5
- **WHEN** the target is E and compass predicts the same three routes
- **THEN** there are two cards: C-E at 70.0% with E marked as the target and labels such as "Reach E", and C-D at 30.0%, which says it does not reach E and is not simulated

#### Scenario: Card for a target already passed
- **WHEN** the target on 2-5 is E and a run is made with the fleet at G after passing C and E
- **THEN** there is one card, C-E at 100.0% with both nodes passed and E marked as the target, Reach E 100.0%, and a note that the target has been reached; the summary shows Reach E 100.0% and "—" for S, A, B and flagship sunk

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

#### Scenario: Tooltip on a battle node
- **WHEN** the rank display is individual, and the route `B-C-E-F-O[Boss]` has finished, with 86% of its trials reaching E, the fleet in 複縦陣 at E, Nelson Touch able to fire there, and S 60%, A 20% and B 10% among trials that fought at E
- **THEN** hovering over E shows Normal battle, reach 86.0%, 複縦陣, Nelson Touch, and S 60.0%, A 20.0% and B 10.0%

#### Scenario: Tooltip follows the rank display
- **WHEN** the rank display is then set to cumulative
- **THEN** the tooltip for E shows S 60.0%, A+ 80.0% and B+ 90.0%

#### Scenario: Tooltip shows the downgraded formation
- **WHEN** a three-ship fleet's formation at a node is set to 輪形陣 and its route has finished
- **THEN** that node's tooltip shows 単縦陣

#### Scenario: Tooltip on a node without a battle
- **WHEN** the route `D-G-I` on 5-3 has finished with target I, and D and G have no battle
- **THEN** hovering over D or G shows No battle and reach 100.0%, and hovering over I shows its full tooltip

#### Scenario: Node types
- **WHEN** a finished route passes a submarine-only node, an air-raid node and a maelstrom
- **THEN** their tooltips start with Submarines only, Air raid and Maelstrom

#### Scenario: Results when the boss is reached
- **WHEN** a route reaches the target in 80% of its trials, gets S in 40% of all its trials, and sinks the enemy flagship there in 40% of all its trials
- **THEN** its card shows S 50.0% and flagship sunk 50.0%

#### Scenario: Individual ranks on a card
- **WHEN** the rank display is individual, and among trials that reached the target a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A 25.0% and B 12.5%

#### Scenario: Cumulative ranks on a card
- **WHEN** the rank display is cumulative, and among trials that reached the target a route gets S 50%, A 25% and B 12.5%
- **THEN** its card shows S 50.0%, A+ 75.0% and B+ 87.5%

#### Scenario: Order does not depend on the rank display
- **WHEN** the user switches the rank display while finished route cards are shown
- **THEN** the cards keep their order

#### Scenario: Results arrive per route
- **WHEN** 1 of 2 simulated routes has finished
- **THEN** that card shows its results, and the other card's results still show pending
