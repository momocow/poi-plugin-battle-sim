## Why

HP changes now start a run mid-sortie, but that run still simulates the selected map from its start, as if the damaged fleet sortied again. Mid-sortie, the user wants the odds of the sortie in progress: the nodes already passed rule out every route that didn't go through them, and what is left to fight is the rest of the route from the node the fleet is at.

## What Changes

- While the selected fleet is on a sortie, the panel is in sortie mode; in port it is in plan mode. The mode shows as a tag at the right of the control bar's first row: a grey **規劃模式** (Plan mode) in port, a red **出擊模式** (Sortie mode) during a sortie. The fleet and map selects are disabled, and the map select shows the sortie's map. Runs simulate the sortie's map with the branch and phase choices remembered for it. The selected map is remembered unchanged, and the panel goes back to it once the fleet is home.
- The run keeps only the predicted routes that start with the nodes the fleet has visited so far, the current node included. Their probabilities are scaled up so they add up to 1: the odds given the path so far.
- Each kept route is simulated from the current node to its end, with the fleet's current HP. Nodes already passed are not fought again.
- A player-chosen branch the fleet has already passed is decided. Its control in the panel shows the branch taken and is locked, and the run predicts with that branch. The choice remembered for the map doesn't change, so it's back after the sortie.
- If the visited nodes still match no predicted route, for example a rare branch that compass didn't predict, the run fails with an error naming the path.
- The fleet advancing to a node of the sortie becomes an automatic-run trigger, even with no HP change, as when entering a node with no battle.
- Route cards show the passed nodes as passed, with no retreat rates. The footer names the sortie's map and the node the fleet is at, and the result counts as stale once the sortie moves on or ends.
- Each ship starts the rest of the route with its current HP, fuel, ammo and planes. The supply part comes from `send-current-supply`, which this change depends on.
- Special attacks the fleet already fired in this sortie are passed to the optimizer, so a Nelson Touch or similar can't fire again in the rest of the route.
- Known limit: if the plugin was loaded mid-sortie (turned off and on in poi's plugin settings, or updated, while the game kept running), the special attacks fired before that are unknown and none are passed. The footer says so.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `route-prediction`: gains a requirement for narrowing the candidates to the sortie's path so far.
- `battle-simulation`: gains a requirement for simulating each route from the current node mid-sortie.
- `simulator-panel`: the Automatic runs requirement gains the sortie advancing as a trigger. A new requirement covers how a mid-sortie run picks its map and how the route cards and the footer show it.

## Impact

- `src/fleet/types.ts` (`PoiState.sortie`): add `sortieStatus`, `sortieMapId` and `spotHistory`.
- A pure helper reads the selected fleet's sortie from the store: whether it's out, its map, and the cells visited.
- Cell numbers turn into node letters through the optimizer's kcnav `_map.json` (`route`: cell → [from, to]), which the run's shared kcnav fetch already writes.
- `src/ui/state.ts` (`RunInput`), `src/ui/runner.ts`, `src/ui/Panel.tsx`, `src/ui/views.ts`, `RouteCards.tsx`, `ResultFooter.tsx`: the effective input carries the sortie, the route filter is applied, the start index for simulation is set, and passed nodes are shown.
- A sortie record module listens to `game.response` and collects the special attacks the selected fleet fires during the sortie. `src/fleet/toToml.ts` writes them as `special_attacks_fired`.
- Depends on `send-current-supply`, and on an optimizer release with `special_attacks_fired`, pinned in `optimizer.json`.
- The optimizer must accept a `route` that starts mid-map. Its resolver looks each letter up separately, and a task confirms this. If it doesn't, the fix belongs in the optimizer repo.
- i18n for the new footer text, the not-observed note and the errors.
