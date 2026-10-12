## Context

- `simulateToml` (`src/optimizer/config.ts`) emits one `[tactics.nodes.<target>]` table, with `do_night_battle` only. No formation is sent, so the optimizer uses `LineAhead` at every node. The pinned optimizer already accepts `[tactics.nodes.<letter>] formation = "<Formation>"` on the `map` + `route` path, with the values `LineAhead` / `DoubleLine` / `Diamond` / `Echelon` / `LineAbreast` / `Vanguard`. It bails on tactics for a node without a battle.
- The optimizer downgrades a single fleet's formation per node (`downgrade_player_formation`): with fewer than 4 alive ships it uses `LineAhead`, and `Diamond` with fewer than 5 becomes `DoubleLine`.
- `src/routes/topology.ts` already reads the map's `_map.json` and copies the optimizer's colour vote, but only exposes it as `nightOnlyNodes` (colour 11). Colours seen in the kcnav cache: 4 battle, 5 boss, 7 air battle (航空戦), 10 air raid (空襲), 11 night battle. `battleNodes` gives every node with a battle.
- Each node's enemy compositions are in `<kcnavDir>/<map>/<letter>.json` (`candidates[].enemy_ids` and `ships_escort`). The map's shared enemy-data fetch writes these files, and a run already waits for that fetch before simulating.
- Enemy ship types come from poi's master data: `const.$ships[id].api_stype`, where 13 is 潜水艦 and 14 is 潜水空母. The panel's `useLiveState` already selects `const`.
- `RunInput` drives both the auto-run key and `isStale`. Branch choices are remembered per map in poi config through `inputs.ts`. The Target / Night battle row appears only once the topology is cached (`TargetControls` in `Controls.tsx`).

## Goals / Non-Goals

**Goals:**
- One module decides a node's default formation and the ship-count limit. The editor (rows, reasons, greying) and the runner (TOML) both use it.
- Saved formations flow through `RunInput`, so stale dimming needs no special handling. The only new run trigger is closing the popup.

**Non-Goals:**
- Combined-fleet formations (CF1–4). `add-combined-fleet-support` will add its own default rule and limits.
- `formation_use_la_if_no_sp_attack` and other per-node tactics.
- Showing formations on the route cards. The stepper is left free for the planned per-node rank rates.

## Decisions

### Editor: a button in the control panel, listing every battle node
A **Formations** button in the Target / Night battle row opens a Blueprint `Popover` with a compact table: one row per battle node (letter, default reason, `HTMLSelect`). The list is scrollable for large maps such as 7-5. The nodes come from `battleNodes(topology)`, not from a prediction, so the editor works before any run and shows the whole map at once. That avoids hunting for a node across many route cards.

### Edits are a draft until the popup closes, then one run starts
The editor holds a draft copy of the map's formations, taken when the popup opens. Picking a formation or Default only changes the draft. When the popup closes (Blueprint `onClose`: clicking outside, Esc, or the button), the panel compares the draft with the copy it took on opening:
- **Unchanged**: nothing happens.
- **Changed**: the panel saves the draft, then starts a run directly with the new `current` input (the same `start` that Simulate uses).

Committing on close means several edits give one run, and no run starts in the middle of editing. That replaces the auto-run delay, which would otherwise be the debounce here.

The save changes `current`, and with it `autoKey`, so the auto-run effect would schedule a second run after the delay. To prevent that, the close handler records the post-save key in `lastAutoKey` before the effect runs. Closing the popup is an explicit action, like Simulate, so it starts a run even when Auto is off. When Simulate is disabled (no fleet or map selected), the change is saved but no run starts. The button is disabled while a run is in progress, so the popup can't be open when a run starts, apart from the one its own close starts.

Alternatives considered:
- Live edits through the auto-run trigger: this starts runs while the user is still editing.
- An explicit Apply button: an extra click, and closing the popup without applying would silently lose the edits.

Alternative: click a node on a route card's stepper. Rejected: when there are many routes, finding a node is hard, there's no overview, and nothing is editable until the map has been predicted.

Rows are sorted by letter with a natural sort, so that `A, A1, A2, B … Z1` keep their order. Boss letters get a marker. They come from the topology's colour 5 (boss), so they show even before the map is predicted in this poi session. The button sits in the row that already depends on the topology, so it appears and hides under the same condition without new state.

### One override layer, persisted per map
`plugin.poi_battle_sim.formations` = `{ [map]: { [letter]: Formation } }`, loaded and saved in `inputs.ts` next to `choices`. Invalid maps, letters and values are dropped on load. Picking Default deletes the entry, and a map with no entries left is dropped too. `RunInput.formations` carries the shown map's entries. Defaults are *not* part of `RunInput`: they are derived data, and they depend on enemy data that may arrive in the middle of a run.

A this-sortie layer was considered (for special attacks) and dropped. It adds a second hidden state with no obvious hint to the user. A one-off change is just a map formation the user sets back afterwards.

### Default rule and ship-count limit module
New `src/routes/formation.ts`:
- A `Formation` union and an `isFormation` guard.
- `nodeColors(route)` in `topology.ts` takes over the body of `nightOnlyNodes`, which becomes a filter over it, so the night and air checks share one vote.
- `nodeEnemies(kcnavDir, map, letter)` reads `<letter>.json` and returns compositions (enemy ids plus escort ids), or `undefined` when the file is missing or unreadable. It is synchronous and cached by path and mtime, because a refresh fetch rewrites the file.
- `defaultFormation({ color, enemies, isSubmarine })` returns `{ formation, reason }`, with rules in the spec's order: submarines only, submarines mixed, night, air, normal. "Submarines only" requires an empty or missing escort, as in the optimizer's `is_all_submarine_node`.
- `allowedFormation(formation, shipCount)` returns the formation the fleet gets, mirroring `downgrade_player_formation`'s single-fleet branch. The editor greys out an option when `allowedFormation(f, n) !== f`, and shows `f → allowedFormation(f, n)` on a row whose formation is not allowed.

"Submarines mixed" uses *any* composition rather than a weighted share. That matches the spec's wording and needs no threshold.

The ship count is the number of ships in the selected fleet's live state, since the editor sets formations for runs to come. Ships that retreat mid-sortie lower the alive count inside the optimizer, which can downgrade later nodes further. The editor doesn't try to predict that.

### Runner and TOML
After the enemy-data wait, the runner computes the formation of each battle node on each route's simulated slice: `input.formations[letter] ?? defaultFormation(...).formation`. It sends the chosen formation, not the downgraded one, and the optimizer applies its own rule, so the two can't diverge. `simulateToml` takes `formations: Record<string, Formation>` and emits one `[tactics.nodes.<letter>]` table per node with `formation`. The target's table also carries `do_night_battle`. Only nodes in `battleNodes(topology)` get a table, so the optimizer never bails on a maelstrom or pass-through node. The runner already receives `PoiState`, which gives it `$ships`.

## Risks / Trade-offs

- [The colour majority misreads a node whose edges disagree] → It's the same vote the optimizer and the Night battle switch use, so the panel and the simulation can't disagree.
- [A node's enemy data is missing because the fetch failed, so a submarine node defaults to 単縦陣] → The row shows the reason "normal battle", which makes this visible, and the user can override it.
- [The editor gets long on large maps] → A scrollable popover with a max height, and one compact row per node.
- [The greying uses the fleet's ship count at the time the editor is open, while sinkings or retreats inside a run can lower it] → The optimizer still downgrades per node, so the simulation stays correct. Only the label can be optimistic for late nodes.

## Migration Plan

No migration is needed: a missing `formations` key loads as `{}`, so existing users start on defaults. A rollback drops the key's readers, and the stored key is harmless.
