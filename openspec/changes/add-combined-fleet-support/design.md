## Context

This change builds on `add-fleet-route-simulation` and reuses its modules (D8 there): `fleet/` (snapshot, TOML, and deck-builder conversion), `routes/compass.ts`, `fleet-view/`, and the panel.

What exists today:
- **poi**: `state.sortie.combinedFlag` (0 none, 1 Carrier Task Force, 2 Surface Task Force, 3 Transport Escort). It is set from `api_combined_flag` on returning to port and from `api_combined_type` when the player combines or splits fleets (`views/redux/sortie/index.ts`).
- **Optimizer**: `[fleet]` accepts `[[fleet.main]]` + `[[fleet.escort]]` (the same ship shape as `[[fleet.ships]]`) and `combined_type = "ctf" | "stf" | "tcf"`. That is valid only in the combined form.
- **Compass**: the deck-builder document can carry `f2`, and the store has `selectedType`, with an action `UPDATE_SELECTED_TYPE`. A single fleet saved `selected_type: 1`. How combined types are encoded, and whether `?pdz=` with `f2` selects the type automatically, has **not been checked yet**.

## Goals / Non-Goals

**Goals:**
- Combined fleets work end to end with no new modules: extend the snapshot type, the two converters, the compass driver, and the fleet view.

**Non-Goals:**
- Changing the combined type in the plugin. The type always comes from the game.
- Striking Force (遊撃部隊, 7 ships in fleet 3).

## Decisions

### D1. The snapshot is a tagged union
`Snapshot = { kind: 'single', fleet } | { kind: 'combined', type: 'ctf' | 'stf' | 'tcf', main, escort }`. Converters and the view switch on `kind`. The mapping from `combinedFlag` to the type lives in the snapshot module, and nothing else reads `combinedFlag`.
- *Alternative*: always use `main` + an optional `escort`. Rejected because the TOML form and the compass type differ by kind, so the converters would branch on `escort != null` anyway, and less visibly.

### D2. Compass fleet type
The deck-builder document gets `f2` for the escort. The injected script then sets the fleet type explicitly with `UPDATE_SELECTED_TYPE(<compass code for the type>)` before `UPDATE_SELECTED_AREA`, reads `selectedType` back, and fails with `COMPASS_SHAPE` if it differs. The compass codes are taken from the live page (task 1.1) and kept in a table next to the branch-choice table.
- *Alternative*: rely on compass to detect the type from `f2`. Rejected because the plugin can't tell which of the three types compass chose without reading it back, and a wrong type gives believable but wrong routes.

### D3. Fleet selector value
The selector values become `1 | 2 | 3 | 4 | 'combined'`. `'combined'` is offered only while `combinedFlag !== 0`. A stored `'combined'` falls back to `1` when the fleets are not combined.

## Risks / Trade-offs

- [Compass combined handling differs from expectations, e.g. it needs other fields set or ignores `f2` from `pdz`] → Task 1.1 checks it live before any code is written. If it can't be driven reliably, combined fleets get a clear "route prediction for combined fleets is unavailable" error until the manual route picker exists.
- [Optimizer "lost a ship" may exclude escort ships] → Task 1.2 checks with a test config before the spec is relied on. If the optimizer excludes them, the fix belongs in the optimizer, not the plugin.
- [Combined fleets double the size of the display] → Two collapsible groups in the existing single column.

## Open Questions

- The compass code for each combined type (answered by task 1.1; it doesn't change the approach).
