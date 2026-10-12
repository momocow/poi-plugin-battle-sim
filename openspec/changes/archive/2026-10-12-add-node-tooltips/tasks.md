## 1. Per-node ranks from every simulation

- [x] 1.1 `src/optimizer/config.ts`: always send `ranks-per-node`; `perNode` adds only `node-outcomes`; update the header comment
- [x] 1.2 Update `test/config.test.ts` (recorded optimizer fixtures stay as recorded: they capture past runs)
- [x] 1.3 Test that a Boss-target route whose result lacks `ranks_per_node` still succeeds (no new failure)

## 2. Special-attack gate mirror

- [x] 2.1 `loadShipGateData(dataDir)`: read `<dataDir>/ships.json` once per process, keeping `attackSpecial`, ship type and `sclass` per id; when the file can't be read, log to the dev log and fall back to no specials
- [x] 2.2 New `src/fleet/specialGates.ts`: `possibleSpecial({ ships, formation, night, fired }, shipData)` returning 100–106, 400, 401 or null, mirroring the optimizer's single-fleet gates (flagship, trigger formations, partners, surface count, 104 night-only, sortie lock with the 104 exemption, 400 before 401); copy the id lists from `special_attack_fleet.rs`, each with a comment naming its source constant; skip HP gates
- [x] 2.3 `test/specialGates.test.ts`: one passing and one failing fleet per kind, plus the spec scenarios (wrong formation, already fired, 104 without night, 3 ships downgraded)

## 3. Per-node info on route rows

- [x] 3.1 `src/ui/state.ts`: `NodeInfo { formation; special }`, `RouteRow.nodeInfo`, and `routeDone` carries it
- [x] 3.2 `src/ui/runner.ts`: in `onRouteDone`, build `nodeInfo` for the row's simulated battle nodes from its formations (after `allowedFormation` for the snapshot's ship count), its night battles, the snapshot and the recorded specials (only when observed); add it to the `route.done` dev log
- [x] 3.3 Test the reducer stores `nodeInfo`, and `routeNodeInfo` (the runner's pure builder, in `state.ts`) builds it (formation downgraded, special with night battle)

## 4. Tooltip

- [x] 4.1 Move `FORMATION_NAMES` to `src/ui/views.ts`; add `rankCells` (S, A/A+, B/B+ by rank display) for the tooltip (`Results` keeps its cells, already computed by `rowCells`), `nodeTooltip`, and the special-attack names
- [x] 4.2 `src/ui/RouteCards.tsx`: wrap each simulated battle node of a finished card in a Blueprint `Tooltip` showing reach, formation, special attack (or none) and the node's S/A/B ("—" where no trial fought); give those nodes `title=""` so the stepper's route text doesn't show over them; update the header comment
- [x] 4.3 `src/ui/styles.ts`: compact grid styling for the tooltip
- [x] 4.4 `i18n/en-US.json`, `ja-JP.json`, `zh-TW.json`: labels (Reach, Formation, Special attack, None) and the nine special names
- [x] 4.5 `test/views.test.ts`: rank-cell helper in both display modes, and a node's ranks picked through `battleIndex` with null → "—"

## 5. Verify

- [x] 5.1 `npm test` and the type check pass
- [x] 4.6 Give nodes without a battle a tooltip too: reach and "No battle" (found on 5-3 `D-G-I`, where only I has a battle)
- [x] 4.7 Show each node's type first in its tooltip: battle types from `NodeFormation.reason` plus air raid by colour, carried on `NodeInfo.type`; Maelstrom or No battle from the optimizer's `_meta.route` `kind`, kept by `readDiag`
- [x] 5.2 Run the plugin in poi: hover the nodes on a finished 5-2 card (type, reach, formation, special, ranks; C reads Air raid) and on 5-3 `D-G-I` (D and G: No battle and reach); switch the rank display; check there's no tooltip on a passed node or a pending card
