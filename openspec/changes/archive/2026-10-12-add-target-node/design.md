## Context

See proposal.md for the motivation. Today a run goes predict and mark `reachesBoss` (`routes/predict.ts`, `routes/boss.ts`) → mid-sortie, narrow to the path so far and set each row's `from` (`routes/sortie.ts`, in `ui/runner.ts`) → simulate the boss routes from `from` → aggregate. The plugin reads the optimizer's `ranks` channel (`ranks`, `ranks_marginal`, `reach_boss_rate`, `boss_sunk_rate`, `per_node_reach`), which is all about the boss.

What the optimizer (0.2.1, pinned) does with a route that stops early, from `CONFIG-SIMULATE.md` and `route_resolver.rs`:
- In `map` + `route` mode, the boss is the route's last node **and** a letter in the map's `boss_letters`. A route that ends anywhere else is a valid "mid-route slice" with **no boss**. For such a route, the `ranks` channel's boss fields are structurally empty or zero.
- `do_night_battle` is required at a boss and optional elsewhere. It takes effect at any battle node.
- The `ranks-per-node` channel gives `ranks_per_node[j]`: ranks at battle node j, among trials that fought there. The `node-outcomes` channel gives `node_outcomes[j].enemy_flag_sunk_rate`, with the same per-node denominator. `per_node_reach[j]` (from `ranks`) is the share of all trials that fought node j.

So a node target needs no optimizer change. The plugin cuts the route at the target and reads that node's per-node values.

## Goals / Non-Goals

**Goals:**
- One run pipeline for both kinds of target. Everything after parsing (aggregate, sorting, views) keeps working on the same per-route shape.
- Boss target runs send the same TOML as today, except that `do_night_battle` follows the switch. They parse the same channels, so the recorded fixtures stay valid.

**Non-Goals:**
- Targeting one boss letter of a map that has several (for example 7-3's first boss E while the route goes on to P). Boss letters are covered by the Boss option only.
- Night battle settings for nodes other than the target.

## Decisions

### Battle nodes from the kcnav topology, before any run
Compass's store gives letters, not node types, and optimizer 0.3.0 rejects a `[tactics.nodes.<X>]` table on a node without a battle at load, before any result (recorded as `no-battle-5-2`). So the plugin tells battle nodes apart itself, from the map's kcnav topology `<kcnavDir>/<map>/_map.json`, which `routes/sortie.ts` already reads mid-sortie. Each `route` edge is `[from, to, colorNo, eventId]`, and the rule copies the optimizer's (`src/data/route_resolver.rs`): a node is a maelstrom when an edge into it has `eventId` 3, and a pass-through when every edge into it has `eventId` 1, 2, 6, 8 or 9. Every other node has a battle; air raids share `eventId` 4 with normal battles.

The topology reading moves out of `routes/sortie.ts` into `routes/topology.ts`, with its synchronous per-map cache, and gains `battleNodes(route): Set<string>`; the panel reads the route table with `topologyNow(kcnavDir, map)`, undefined while the file is missing. `cellLetters` / `cellLettersNow` use the same module.

The topology exists only after the map's shared enemy-data fetch. Until then the panel hides the Target row and runs use Boss with night battle on, today's behavior, so a first run on a map never needs it. The saved target and switch are left as they are; the panel's run input simply uses the Boss pair. Once the file is there, the dropdown lists `nodesFor(map)` filtered to battle nodes. The panel reads it on render, and it re-renders on the run's `enemyDataReady` / `predicted` / `finished` dispatches, so the row appears without a new run.

The same file marks night-battle nodes, where the optimizer always fights a night battle and ignores `do_night_battle` (`node_colors` in `response.rs`: a majority vote of `colorNo` over the edges into the node, spawn edges and invalid values not counted, ties to the smaller code; 11 is a night-battle node). `nightOnlyNodes(route)` copies that vote. At such a target the panel shows the Night battle switch on and locked, with a tooltip, and sends `nightBattle: true`; the saved switch is left alone. A boss is never one: the optimizer rejects a night-battle boss.

The runner checks a node target against the same set before simulating and fails with a `SimError` (`TARGET_NOT_BATTLE`, naming the node) when it has no battle. That only happens to a remembered target whose map data changed. The copied rule has to follow the optimizer's on a version bump; a test against the recorded 2-5 and 5-2 topologies pins it.

Alternatives: map the optimizer's load error onto ours (string-matches a Chinese message, and only fires after the user picked the node), or call the optimizer's `kcnav nodetypes` command (a process per render).

### Target model: one `target?: string`, `undefined` = Boss
`RunInput` gains `target: string | undefined` and `nightBattle: boolean`. The saved inputs gain `target` (a letter; missing means Boss) and `nightBattle` (default `true`), stored under `plugin.poi_battle_sim.target` and `.nightBattle`. A missing key fits poi's config, which reads `null` as missing, so Boss is written as `null` and needs no sentinel.

The target belongs to the sortie being planned, not to the map: different sorties on the same map can aim at different nodes, so it is not keyed by map. A letter means nothing on another map, so the map select's handler writes `target: undefined` and `nightBattle: true` along with the new map; the night-battle setting goes with the planned sortie too. Sortie mode only changes the map shown (`shownMap`), not the saved map, so it leaves both alone.

### Sortie target: shared on the same map, its own otherwise
When the sortie's map is the selected map, sortie mode reads and writes the saved `target` / `nightBattle`. Otherwise `Panel.tsx` keeps a sortie-only `{ target, nightBattle }` in React state, starting at Boss / on, and resets it whenever the sortie's map changes or the sortie ends (the `sortie?.map` it was made for no longer matches). It is never written to poi's config. A helper picks the pair in use: `sortie && sortie.map !== inputs.map ? sortieTarget : saved`. `current`, the Controls values and their handlers all go through it, so staleness and auto-runs follow without anything else. A poi restart mid-sortie on another map starts the sortie's pair at Boss / on again, which is acceptable for a session-only value. The alternatives were a per-map record, rejected for the reason above, or folding the target into `choices[map]`, whose values go to compass verbatim and are checked against compass's choice keys.

### Cut and merge after narrowing, in the routes layer
`routes/boss.ts` becomes the target module. It gets one function, `applyTarget(candidates, target, bossLetters, from = 1) → RouteCandidate[]`, that marks `reachesTarget`, cuts the nodes after the target's first occurrence after the start node, and merges equal cut node lists (summing probabilities, in first-seen order, keeping `from`). When that occurrence is before `from`, the fleet has passed the target: the row is also marked `passedTarget` and is not simulated (`targetRouteIndexes` leaves it out). Narrowing keeps only routes that share the visited prefix, so a passed target is passed on every row, and they all merge into one row at probability 1. `rowCells` gives it a `passed` kind (reach 1, no rates), and `summaryCells` reports reach 1 with the rank and flagship-sunk values undefined.

The predictor stops marking: it caches and returns the **uncut** compass candidates, each marked `endsAtBoss`, and its key does not include the target, so a target change hits the cache. The runner calls `applyTarget` after `narrowToPath` (or straight after `predict` in plan mode), with the row's `from`. The order matters: narrowing checks that a candidate's nodes start with the visited letters, so a route already cut at a target behind the fleet would be dropped and the run would fail with `SORTIE_PATH_UNMATCHED`.

`RouteCandidate.reachesBoss` is renamed `reachesTarget`, and `bossRouteIndexes` / `progress` follow. Views that still need it (`[Boss]` in the route text, the boss mark) use `endsAtBoss`. With the Boss target, `reachesTarget === endsAtBoss`.

Alternatives: cut inside `predict()`, rejected for the ordering above; or cut in the views, rejected because the panel would then see uncut rows that it has to reinterpret, and two places would own "what is a route for this target".

### Node options owned by the predictor
The predictor records, per map, its latest uncut candidates and the map's boss letters, and exposes the options as `nodesFor(map, visited?): string[]`: the sorted unique letters, leaving out the start node and the boss letters. Mid-sortie, the panel passes the visited letters, and only candidates starting with them count, from the node the fleet is at on, so passed nodes and routes no longer possible drop out. The predictor already lives for the poi session and sees every prediction, so it is the one owner. The panel reads it when it renders, and re-renders on the `predicted` dispatch, so the dropdown fills in after the first prediction. The remembered target is added to the options when it is missing from them, the same way the map select shows an unoffered remembered map.

Alternatives: a static per-map table, which has to be maintained, or the kcnav `_map.json` topology, which only exists after the fetch and includes non-battle nodes. The user chose predicted routes.

### TOML: night battle from the switch; per-node channels only for a node target
`simulateToml` gets `nightBattle` and `perNode: boolean`. It writes `[tactics.nodes.<last>] do_night_battle = <nightBattle>`. When `perNode` is set, it writes `fields = ["ranks", "ranks-per-node", "node-outcomes"]`; otherwise it writes `["ranks"]` as today. Asking for the extra channels only when they are needed keeps Boss runs byte-for-byte as today when night battle is on, and saves the per-node collection cost.

### Normalize a node-target result into the existing `SimulateDiag` shape
`run.ts` parses the optional `ranks_per_node` and `node_outcomes`. A new `atNodeTarget(diag)` takes the last route node's `battleIndex` j. It throws the same `TARGET_NOT_BATTLE` error when j is null, as a guard; the runner's topology check and the optimizer's own load check normally stop such a run first. It throws the incompatible-version error when the per-node entries for j are missing or null. Otherwise it returns the diag with:
- `reach_boss_rate = per_node_reach[j]`;
- `ranks = ranks_per_node[j]`;
- `ranks_marginal[r] = ranks_per_node[j][r] × reach`;
- `boss_sunk_rate = node_outcomes[j].enemy_flag_sunk_rate × reach`.

The runner applies it after `checkRoute` when the target is a node. `aggregate`, `routeReach`, `retreats`, sorting and `rowCells` stay as they are. In context, `SimulateDiag`'s fields now mean "at the route's last node, the target", which is documented on the type. Its field names stay the optimizer's wire names. The view-level names in `views.ts` (`reachBoss`, `bossSunk`, `…AtBoss`) are renamed to target terms.

Alternative: always read per-node values, for the boss too. Rejected for now, because it changes every Boss run's request and needs every recorded fixture re-recorded, for no change in what the user sees.

A node `ranks_per_node[j]` of `null` (no trial fought there) with `per_node_reach[j] = 0` is not an error. Reach is 0 and the conditional rates are undefined, the same as a boss that is never reached.

### Labels
`views.ts` gets `targetLabels(target)`, which returns the strings for reach, sunk, "when reached" and "not simulated". For Boss these are the existing keys ("Reach boss", "Boss sunk", …). For a node they are new keys with a `{node}` placeholder ("Reach {node}", "{node} flagship sunk", "Not simulated (does not reach {node})"). Cards, the summary and the footer take the run's target from `runState.input`, not from the live selection, so a stale result keeps its own labels.

### Controls
A new second control row, above the branch and phase row, holds `Target [HTMLSelect]` and a `Night battle` Blueprint `Switch`. Both are disabled while running, like the choice selects, and stay enabled in sortie mode, like branches not passed yet. The row is hidden while no map is shown (after Reset, outside a sortie). Its options come from `nodesFor(shownMap)` (`shownMap` in `Panel.tsx`: the sortie's map in sortie mode), and it writes the one saved target.

`Panel.tsx` builds `current: RunInput` in two branches, plan and sortie; both gain `target` and `nightBattle` from the pair in use (see Sortie target). The auto-run key is `JSON.stringify` of `current`, so it picks both up with no change. `isStale` in `views.ts` compares field by field, so it gains `target` and `nightBattle`; the "Auto turned back on over a stale result" run follows from it. Reset's handler also writes `target: undefined` and `nightBattle: true` alongside the cleared fleet and map.

## Risks / Trade-offs

- [The target's options are empty until compass has predicted the map this session] → Auto-run predicts within the delay after the map is picked, and a remembered target always shows. Boss works without any prediction.
- [The battle-node rule is copied from the optimizer and can drift on a version bump] → A test on the recorded topologies; `TARGET_NOT_BATTLE` and the optimizer's own load error still stop a wrong pick.
- [The target is hidden on a map's first run] → It is the run that fetches the topology; the row appears as soon as that fetch ends, usually before the run finishes.
- [The `ranks-per-node` / `node-outcomes` shapes] → Recorded with optimizer 0.3.0 for a cut route (`node-target-5-2`) and tested against.
- [The rename `reachesBoss` → `reachesTarget` touches many files] → Mechanical rename, checked by the type check.
- [Mid-sortie past the target, nothing is simulated] → Intended: that battle is over. The card shows the route clipped at the target as reached, and the dropdown, which offers only nodes ahead, lets the user pick a new target; the remembered one still shows while it is selected.
- [A merged route's per-node stats are simulated once, from the shared prefix] → This is correct: after the cut, the merged routes are identical up to the target, and what comes after the target does not affect the battle there.

## Migration Plan

No data migration. Missing config keys mean Boss and night battle on, which is today's behavior. Rollback is reverting the change; the extra config keys are then ignored.
