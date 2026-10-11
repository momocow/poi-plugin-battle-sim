## Why

The panel always simulates a sortie up to the boss, and only routes that end at a boss node are simulated. Many sorties aim somewhere else: quests that ask for an S rank at a mid-map node, or farming a particular node. For those, the boss results are the wrong answer, and the routes that stop at the wanted node count as "not simulated".

## What Changes

- A **Target** dropdown, on a new second row of the control bar, sets the node a sortie ends at. It defaults to **Boss**, which keeps today's behavior. The other options are the battle nodes on the routes compass last predicted for that map in this poi session, except the map's boss letters. Battle nodes are read from the map's kcnav topology, as the optimizer reads them.
- The dropdown and the Night battle switch appear once the map's topology is cached, which the map's first enemy-data fetch writes. Until then a run uses Boss with night battle on, as today. A remembered target that is not among them still shows.
- There is one target for the sortie being planned, not one per map, since different sorties on the same map can aim at different nodes. Selecting another map sets it back to Boss and turns Night battle back on; entering or leaving sortie mode does not.
- A sortie on the selected map uses and changes the panel's target and Night battle switch. A sortie on another map has its own, starting at Boss and on, and they last for that sortie only. It is remembered between poi sessions.
- With a node target, each predicted route that passes the target is cut off at the target and simulated up to there. Routes that become the same after the cut are merged, with their probabilities added. Routes that never pass the target are not simulated.
- Mid-sortie, the routes are first narrowed to the sortie's path so far, then cut at the target. The target stays editable in sortie mode, offering only the nodes the fleet can still reach. A target the fleet has already passed shows as reached: the route clipped there, nothing simulated, the rank rates as "—".
- A **Night battle** switch sets whether the fleet pursues night battle at the target. It is on by default, which matches today's boss behavior, and it is remembered between poi sessions.
- The summary, route cards and footer describe the target: reach rate, ranks, and flagship sunk at the target node. Their labels name the node (for example "Reach J"), and say "boss" only when the target is Boss. The A and B ranks follow the rank display setting, as today.
- Changing the target or the night-battle switch counts as an input change. It starts an automatic run, and it dims a result that no longer matches. A target change reuses the cached prediction, so compass is not loaded again.
- Reset sets the target back to Boss and turns Night battle back on, and hides the Target dropdown while no map is selected.
- If a node target has no battle (only possible for a remembered target), the run fails before simulating with an error that says to pick a battle node.

No optimizer change is needed. The pinned optimizer (0.3.0) already accepts routes that stop before the boss, and it reports per-node ranks and flagship-sunk rates through its `ranks-per-node` and `node-outcomes` output channels.

## Capabilities

### New Capabilities

### Modified Capabilities
- `route-prediction`: "Boss reach is determined from bundled map data" changes to reaching the selected target. Routes are cut at a node target and merged, after any mid-sortie narrowing.
- `battle-simulation`: simulation, the weighted aggregate, the rates when reached, and the per-node reach rate all refer to the target, not always the boss. The night battle at the target follows the switch.
- `simulator-panel`: Inputs gains the Target dropdown and the Night battle switch. Automatic runs, Mid-sortie runs, Route cards, Result footer and Summary result cover the target. The layout gains the new control row, and Selection reset clears the target and the switch.

## Impact

- `src/routes/boss.ts` → target handling: whether a route reaches the target, cutting and merging routes, the node options from a prediction.
- `src/routes/predict.ts`: returns the uncut candidates as today, marked `endsAtBoss`, and records each map's node options; the cache still holds the uncut routes.
- `src/optimizer/config.ts`: `do_night_battle` at the last node follows the switch; the per-node output channels are requested for a node target.
- `src/optimizer/run.ts`: parse `ranks_per_node` and `node_outcomes`, and derive the target's rates for a node target.
- `src/ui/runner.ts`: applies the target after `narrowToPath`, from the node the fleet is at.
- `src/ui/inputs.ts`, `state.ts`, `Panel.tsx`, `Controls.tsx`, `RouteCards.tsx`, `Summary.tsx`, `ResultFooter.tsx`, `views.ts` (`isStale` included): the new inputs, the run input (plan and sortie mode), the node options, and the target-aware labels.
- `i18n/*.json`: the new labels in en-US, ja-JP, zh-TW.
- Tests: cutting and merging (mid-sortie included), the derived per-node diag, the TOML, load/save of the inputs, staleness, and a recorded optimizer fixture for a route that stops before the boss.
