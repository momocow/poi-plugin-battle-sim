## 1. Optimizer fixture

- [ ] 1.1 Record a real `simulate --config - --json --seed 1` output from optimizer 0.2.1 for a route cut before the boss. Use 5-2 `B-C-E` with `fields = ["ranks", "ranks-per-node", "node-outcomes"]` and `do_night_battle = true` at E. Save it as `test/fixtures/optimizer/recorded-0.2.1/node-target-5-2.*` with its `input-node-target.toml`, and describe it in the fixtures README
- [ ] 1.2 Also record a cut route whose last node has no battle (for example 5-2 `B`, a pass-through node in 0.2.1), or note in the README why the optimizer rejects it, so the no-battle error has a test input

## 2. Target in the routes layer

- [ ] 2.1 Turn `src/routes/boss.ts` into the target module: keep `loadBossLetters` / `bossLettersFor`, and replace `reachesBoss` with `applyTarget(candidates, target, bossLetters)`. It marks `reachesTarget` and `endsAtBoss`, cuts after the target's first occurrence, and merges equal cut routes by summing probabilities. Update the header comment
- [ ] 2.2 In `src/routes/predict.ts`, rename `reachesBoss` → `reachesTarget`, add `endsAtBoss`, and pass `target` through `predict()`. Cutting happens after the cache. Record each map's latest uncut node letters, without the start node and boss letters, sorted and unique, and expose them as `nodesFor(map)`
- [ ] 2.3 Tests in `test/routes.test.ts`: the Boss target is unchanged; the 2-5 target E cut-and-merge scenario; a target on no route; probabilities still sum to 1; a target change hits the cache (the compass stub is called once); `nodesFor` gives the 2-5 options from the spec scenario

## 3. Optimizer config and result

- [ ] 3.1 In `src/optimizer/config.ts`, add `nightBattle` and `perNode` to `simulateToml`. Write `do_night_battle = <nightBattle>` at the last node, and the three output fields when `perNode` is set. Update the header comment, which says the plugin always pursues night battle
- [ ] 3.2 In `src/optimizer/run.ts`, parse the optional `ranks_per_node` and `node_outcomes`, and add `atNodeTarget(diag)` as in design.md: derive reach, the conditional and marginal ranks, and flagship-sunk from the last node's battle index. Raise a `SimError` naming the node when it has no battle, and the incompatible-version error when the per-node entries are missing. Document on `SimulateDiag` that its rates are at the route's last node
- [ ] 3.3 Tests in `test/run.test.ts`: the TOML for Boss with night battle on is unchanged from today; night battle off; the `perNode` fields; `atNodeTarget` on the 1.1 fixture (S × reach and sunk × reach, per the battle-simulation scenario); the no-battle error; the missing per-node entries error

## 4. Run state and runner

- [ ] 4.1 In `src/ui/state.ts`, add `target?: string` and `nightBattle: boolean` to `RunInput`. Rename `bossRouteIndexes` → `targetRouteIndexes`, and make `progress` use `reachesTarget`
- [ ] 4.2 In `src/ui/runner.ts`, pass the target to `predict`, pass `nightBattle` and `perNode` to `simulateToml`, and apply `atNodeTarget` after `checkRoute` for a node target. Update the header comment ("simulate the routes that reach the target")
- [ ] 4.3 In `src/ui/inputs.ts`, add `targets` (per map, a missing key means Boss) and `nightBattle` (default true) to `SavedInputs`, with load/save under `plugin.poi_battle_sim.targets` and `.nightBattle`, plus a `targetForMap` helper. Invalid stored values fall back to the defaults. Add tests in `test/inputs.test.ts`

## 5. Panel UI

- [ ] 5.1 In `src/ui/Controls.tsx`, add a row with the Target `HTMLSelect` (Boss, then `nodesFor(map)`, plus the remembered target when it is missing) and the Night battle `Switch`. Both are disabled while running
- [ ] 5.2 In `src/ui/Panel.tsx`, wire the target and night battle into `current: RunInput`, the auto-run key, and the update handlers. Re-render reads `nodesFor(map)`
- [ ] 5.3 In `src/ui/views.ts`, rename the view cells to target terms (`reachTarget`, `targetSunk`, `…AtTarget`), add `targetLabels(target)`, and add the target and "No night battle" to the footer description. `formatRoute` keeps `[Boss]` from `endsAtBoss`. Update `test/views.test.ts`
- [ ] 5.4 In `RouteCards.tsx`, `Summary.tsx` and `ResultFooter.tsx`, use the run's target labels and mark the target node on the stepper (the boss mark when `endsAtBoss`). Show "not simulated (does not reach {node})" for routes that miss the target
- [ ] 5.5 Add the new strings to `i18n/en-US.json`, `ja-JP.json` and `zh-TW.json`: Target, Boss (option), Night battle, Reach {node}, {node} flagship sunk, Not simulated (does not reach {node}), When {node} is reached, Target {node}, No night battle, and the no-battle error. Check that `test/i18n.test.ts` passes

## 6. Verify

- [ ] 6.1 Run the type check and the test suite
- [ ] 6.2 In poi: on 2-5 with the Boss target, the results match today's. Pick E: a fast run with no compass reload, cards C-E and C-D, and labels that read "Reach E". Turn Night battle off: a new run, and the footer says "No night battle". Restart poi: the target and switch are restored. Pick a resource node: an actionable error
