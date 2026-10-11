## Why

The panel always simulates a sortie up to the boss, and only routes that end at a boss node are simulated. Many sorties aim somewhere else: quests that ask for an S rank at a mid-map node, or farming a particular node. For those, the boss results are the wrong answer, and the routes that stop at the wanted node count as "not simulated".

## What Changes

- A **Target** dropdown in the control bar sets the node a sortie ends at. It defaults to **Boss**, which keeps today's behavior. The other options are the node letters on the routes compass last predicted for that map in this poi session, except the map's boss letters. A remembered target that is not among them still shows.
- The target is remembered per map between poi sessions.
- With a node target, each predicted route that passes the target is cut off at the target and simulated up to there. Routes that become the same after the cut are merged, with their probabilities added. Routes that never pass the target are not simulated.
- A **Night battle** switch sets whether the fleet pursues night battle at the target. It is on by default, which matches today's boss behavior, and it is remembered between poi sessions.
- The summary, route cards and footer describe the target: reach rate, ranks, and flagship sunk at the target node. Their labels name the node (for example "Reach J"), and say "boss" only when the target is Boss.
- Changing the target or the night-battle switch counts as an input change. It starts an automatic run, and it dims a result that no longer matches. A target change reuses the cached prediction, so compass is not loaded again.
- If a node target has no battle on a route, that run fails with an error that says to pick a battle node.

No optimizer change is needed. The pinned optimizer (0.2.1) already accepts routes that stop before the boss, and it reports per-node ranks and flagship-sunk rates through its `ranks-per-node` and `node-outcomes` output channels.

## Capabilities

### New Capabilities

### Modified Capabilities
- `route-prediction`: "Boss reach is determined from bundled map data" changes to reaching the selected target. Routes are cut at a node target and merged.
- `battle-simulation`: simulation, the weighted aggregate, the rates when reached, and the per-node reach rate all refer to the target, not always the boss. The night battle at the target follows the switch.
- `simulator-panel`: Inputs gains the Target dropdown and the Night battle switch. Automatic runs, Route cards, Result footer and Summary result cover the target.

## Impact

- `src/routes/boss.ts` → target handling: whether a route reaches the target, cutting and merging routes, the node options from a prediction.
- `src/routes/predict.ts`: `reachesBoss` becomes `reachesTarget`; the cache still holds the uncut routes.
- `src/optimizer/config.ts`: `do_night_battle` at the last node follows the switch; the per-node output channels are requested for a node target.
- `src/optimizer/run.ts`: parse `ranks_per_node` and `node_outcomes`, and derive the target's rates for a node target.
- `src/ui/inputs.ts`, `state.ts`, `runner.ts`, `Panel.tsx`, `Controls.tsx`, `RouteCards.tsx`, `Summary.tsx`, `ResultFooter.tsx`, `views.ts`: the new inputs, the run input, the node options, and the target-aware labels.
- `i18n/*.json`: the new labels in en-US, ja-JP, zh-TW.
- Tests: cutting and merging, the derived per-node diag, the TOML, load/save of the inputs, and a recorded optimizer fixture for a route that stops before the boss.
- This change touches the same files as the pending `add-selection-reset` change, so whichever lands second needs a merge.
