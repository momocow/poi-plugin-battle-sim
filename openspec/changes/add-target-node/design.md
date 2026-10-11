## Context

See proposal.md for the motivation. Today a run goes predict → mark `reachesBoss` (`routes/boss.ts`) → simulate the boss routes → aggregate. The plugin reads the optimizer's `ranks` channel (`ranks`, `ranks_marginal`, `reach_boss_rate`, `boss_sunk_rate`, `per_node_reach`), which is all about the boss.

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
- Telling battle nodes apart from others before a run. Compass's store gives letters, not node types. A non-battle target is caught after the simulation.
- Targeting one boss letter of a map that has several (for example 7-3's first boss E while the route goes on to P). Boss letters are covered by the Boss option only.
- Night battle settings for nodes other than the target.

## Decisions

### Target model: `target?: string` per map, `undefined` = Boss
`RunInput` gains `target: string | undefined` and `nightBattle: boolean`. The saved inputs gain `targets: Record<map, letter>`, where a missing key means Boss, and `nightBattle` (default `true`). These are stored under `plugin.poi_battle_sim.targets` and `.nightBattle`. A missing key fits poi's config, which reads `null` as missing, so no sentinel is needed. The alternative was folding the target into `choices[map]`, but those values go to compass verbatim and are checked against compass's choice keys, so that would leak a non-compass key.

### Cut and merge after the cache, in the routes layer
`routes/boss.ts` becomes the target module. It gets one function, `applyTarget(candidates, target, bossLetters) → RouteCandidate[]`, that marks `reachesTarget`, cuts the nodes after the first occurrence of the target, and merges equal cut node lists (summing probabilities, in first-seen order). The predictor keeps caching the **uncut** compass candidates, and its key does not include the target, so a target change hits the cache. `RouteCandidate.reachesBoss` is renamed `reachesTarget`, and `bossRouteIndexes` / `progress` follow. For views that still need it (`[Boss]` in the route text, the boss mark), each row also carries `endsAtBoss`. With the Boss target, `reachesTarget === endsAtBoss`.

Alternative: cut in the runner or the views. Rejected, because the panel would then see uncut rows that it has to reinterpret, and two places would own "what is a route for this target".

### Node options owned by the predictor
The predictor records, per map, the sorted unique letters of its latest uncut candidates, leaving out the start node and the boss letters. It exposes them as `nodesFor(map): string[]`. The predictor already lives for the poi session and sees every prediction, so it is the one owner. The panel reads it when it renders, and re-renders on the `predicted` dispatch, so the dropdown fills in after the first prediction. The remembered target is added to the options when it is missing from them, the same way the map select shows an unoffered remembered map.

Alternatives: a static per-map table, which has to be maintained, or the kcnav `_map.json` topology, which only exists after the fetch and includes non-battle nodes. The user chose predicted routes.

### TOML: night battle from the switch; per-node channels only for a node target
`simulateToml` gets `nightBattle` and `perNode: boolean`. It writes `[tactics.nodes.<last>] do_night_battle = <nightBattle>`. When `perNode` is set, it writes `fields = ["ranks", "ranks-per-node", "node-outcomes"]`; otherwise it writes `["ranks"]` as today. Asking for the extra channels only when they are needed keeps Boss runs byte-for-byte as today when night battle is on, and saves the per-node collection cost.

### Normalize a node-target result into the existing `SimulateDiag` shape
`run.ts` parses the optional `ranks_per_node` and `node_outcomes`. A new `atNodeTarget(diag)` takes the last route node's `battleIndex` j. It throws a `SimError` (new code, or `INTERNAL`-style user message: "Node X has no battle; pick a battle node as the target") when j is null. It throws the incompatible-version error when the per-node entries for j are missing or null. Otherwise it returns the diag with:
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
A new control row, shown for every map, holds `Target [HTMLSelect]` and a `Night battle` Blueprint `Switch`. Both are disabled while running, like the other selects. The auto-run key in `Panel.tsx` gains `target` and `nightBattle`. The staleness comparison in the footer compares `RunInput`s, so it covers both inputs.

## Risks / Trade-offs

- [The target's options are empty until compass has predicted the map this session] → Auto-run predicts within the delay after the map is picked, and a remembered target always shows. Boss works without any prediction.
- [A user picks a resource or empty node] → The run fails after its first simulation with an actionable error. Options are not filtered by battle-ness (see Non-Goals).
- [The `ranks-per-node` / `node-outcomes` shapes are not covered by a recorded fixture yet] → Record one with optimizer 0.2.1 for a cut route (a task) and test parsing against it.
- [The rename `reachesBoss` → `reachesTarget` touches many files, which conflicts with the pending `add-selection-reset` change in `Panel.tsx` / `Controls.tsx`] → Mechanical rename; whichever change lands second rebases.
- [A merged route's per-node stats are simulated once, from the shared prefix] → This is correct: after the cut, the merged routes are identical up to the target, and what comes after the target does not affect the battle there.

## Migration Plan

No data migration. Missing config keys mean Boss and night battle on, which is today's behavior. Rollback is reverting the change; the extra config keys are then ignored.
