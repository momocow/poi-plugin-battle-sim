## Context

- A finished route row holds `diag` (`SimulateDiag`). It already has what the tooltip's reach rate needs: `per_node_reach` plus `route` meta, combined by `routeReach` in `views.ts`. `ranks_per_node` exists in the type, but `simulateToml` only asks for it for a node target (`perNode`).
- The runner resolves each route's formations (`mapFormations`, the user's choice or the default) and night battles (`nightBattlesFor`) just before simulating. Neither is stored on the row. `allowedFormation` mirrors the optimizer's ship-count downgrade.
- A mid-sortie run has the special attacks fired so far (`specialsFired()`: `fired`, `observed`).
- The optimizer has its gates in `src/simulator/special_attack_fleet.rs` (`check_*_gates`, `trigger_formations_for_flagship`, documented in `special_attack_fleet.md`). It prints nothing structured about them. The user ruled out optimizer changes.
- `<dataDir>/ships.json` (about 2 MB, a list of about 1,800 entries) carries `id`, `attack_special`, `ship_type`/`stype_id` and `sclass` per ship id. poi's `$ships` has no `attack_special`.

## Goals / Non-Goals

**Goals:**
- A Blueprint tooltip per simulated node on a finished card; a node without a battle shows its reach and "No battle". A battle node shows: reach rate, formation, the special attack that can fire (by name) or none, and S/A/B at that node as the rank display sets them.
- No optimizer change, and no change to what is sent to the optimizer, apart from always requesting `ranks-per-node`.

**Non-Goals:**
- Special-attack trigger rates, or whether a special fires at an earlier node of the same route. Either would need an optimizer channel.
- Combined fleets. Their gates and formations belong to `add-combined-fleet-support`.
- Tooltips on pending cards, not-simulated cards or passed nodes: nothing was simulated there.
- HP-dependent gates. They change during the sortie, and the optimizer's own route lint leaves them out for the same reason.

## Decisions

**1. Always request `ranks-per-node`.** `simulateToml` always sends `fields = ["ranks", "ranks-per-node"]` and adds `node-outcomes` only for a node target. The optimizer documents `ranks-per-node` as free, since it reads existing `BattleResult` fields. `readDiag` already treats it as optional, and only `atNodeTarget` needs it to be present. The `perNode` flag goes back to meaning "node target" and now controls `node-outcomes` only. Recorded fixtures and `config` tests change to match.

**2. Per-node info travels on the `routeDone` action, not inside `diag`.** `SimulateDiag` is the optimizer's wire shape, and formation and special come from the plugin. `RouteRow` gains `nodeInfo?: Record<string, NodeInfo>`, keyed by battle-node letter, with `NodeInfo = { formation: Formation; special: SpecialAttack | null }`. The runner builds it in `onRouteDone` from values it already has in scope for that row: its formations, its night battles, the snapshot, and `specials`. The formation is `allowedFormation(chosen, snapshot.ships.length)`. Keying by letter matches `formations` and `nightBattles`. A route passing a node twice gets the same formation both times, as the TOML does.
 *Alternative:* a separate `nodeInfo` action at simulate start, so pending cards could show formation. Rejected: the spec shows the tooltip on finished routes only, and one action keeps the reducer simple.

**3. Static gate mirror in `src/fleet/specialGates.ts`.** It is a pure function, `possibleSpecial({ ships, formation, night, fired }, shipData) → SpecialAttack | null`, where `SpecialAttack` is one of 100–106, 400 or 401. It mirrors the optimizer's gate table for single fleets:
 - flagship kind from `attack_special`. Yamato goes by mid list: 3-ship flagships 911/916, 2-ship flagships 546/911/916. 400 is tried before 401;
 - trigger formations: 100 and 105 in 複縦陣; 101, 102, 103, 106, 400 and 401 in 梯形陣; 104 in 単縦陣 or 梯形陣;
 - partner gates by ship id and type, as in the optimizer: the Colorado partners list, the Richelieu and Warspite partner mids, the 金剛型 per-flagship partners, the Yamato 3-ship pairs and 2-ship partners, BB/FBB/BBV seconds for 101–103, and no submarines or shelling carriers in positions 3 and 5 for Nelson;
 - non-submarine count ≥ 6, or ≥ 5 for 104; 104 only at night;
 - sortie lock: a kind in `fired` cannot fire again, except 104. Yamato 400 and 401 share one lock, as in the optimizer's `did_special_attack`.
 HP gates are skipped. The id lists are copied from named constants in `special_attack_fleet.rs` (for example `COLORADO_PARTNER_MIDS`, `YAMATO_3SHIP_PAIRS`, `RICHELIEU_PARTNER_MIDS`), each with a comment naming its source. Unit tests cover one passing and one failing fleet per kind.
 *Alternative:* parse the optimizer's stderr `[編成健檢]` lint. Rejected: it is unstructured text, covers only formation, and only warns about non-boss nodes.

**4. Ship data loader.** `loadShipGateData(dataDir)` reads `ships.json` once per process, cached in a module-level promise as the binary resolution is. It keeps only `{ attackSpecial, stype, sclass }` per id. If the file can't be read, the error is logged to the dev log and every node gets `special: null`. A missing special is not worth failing the run.

**5. Tooltip UI.** Each simulated node circle in `Stepper` is wrapped in a Blueprint `Tooltip` (`targetTagName="div"`, `placement="top"`), matching the panel's other tooltips. A small `NodeTooltip` renders a compact grid: Reach, 陣形, 特攻, then S, A/A+ and B/B+. Rank labels and values come from `rankCells` in `views.ts`, which uses the same A/B pairing as `rowCells`. The rank cells are left uncoloured, because the tooltip's background is the opposite of the theme. The node's reach is `routeReach(diag)[i]`. Its ranks are `diag.ranks_per_node?.[route[i].battleIndex]`, and `null` or missing shows "—". Every tooltip starts with the node's type. For a battle node, `NodeInfo.type` is built by the runner from the node's `NodeFormation.reason` (the default formation's rule), with `air` split into air raid and air battle by `nodeColors`. So the type follows the same rule priority as the default formation; a submarine node that also has an air attack reads Submarines only. For a node without a battle, `readDiag` now keeps the optimizer's `_meta.route` `kind` on `RouteNodeMeta`: `maelstrom` reads Maelstrom, and anything else reads No battle. A node whose `battleIndex` is null shows only its type and Reach. Formation names reuse `FORMATION_NAMES` (moved from `NodeSettings.tsx` to `views.ts` so both import it). The stepper's native `title` would show alongside Blueprint's tooltip, so a node that has a tooltip gets `title=""`, which suppresses the ancestor's native title. Elsewhere on the stepper the route text still shows.

**6. i18n.** The special names are added to `en-US`, `ja-JP` and `zh-TW`: Nelson Touch, 長門一斉射, 陸奥一斉射, Colorado特殊攻撃, 金剛型夜戦特殊攻撃, Richelieu特殊攻撃, Warspite特殊攻撃, 大和型三隻特殊攻撃 and 大和型二隻特殊攻撃. So are "None" and the labels "Reach", "Formation" and "Special attack".

## Risks / Trade-offs

- [The gate mirror drifts when the optimizer changes its gates or adds a kind] → Each list cites its source constant. The header comment names `special_attack_fleet.md` as the reference. Unknown `attack_special` values give `null`.
- ["Can fire" reads as "will fire"] → The tooltip wording says the special *can* fire. The note in the spec makes clear that HP and earlier firing on the same route are not considered.
- [Ranks per node are noisy at a node few trials reach] → The reach rate shown next to them gives the context. No minimum is applied.
- [Reading 2 MB of JSON] → It is read once per process, and only the three fields are kept.
