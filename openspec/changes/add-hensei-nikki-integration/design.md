## Context

From `poooi/plugin-hensei-nikki` v5.0.5 (no license; read only to learn its data format and actions, and no code is copied):
- **State**: its reducer is registered as the poi store extension `poi-plugin-hensei-nikki`, at `state.ext['poi-plugin-hensei-nikki']._.henseiData.data` (poi's `extensionSelectorFactory`; the exact path is checked in task 1.1). It is `Record<title, SavedFleetData>`.
- **Record**: `{version: 'poi-h-v1', fleets: Array<Fleet | undefined>, note?, tags?}`. `Fleet = Array<{id: shipMasterId, lv, saku, soku, slots: Array<{id: equipMasterId, lv: improvement, alv?}> & {ex?: {id}}}>`.
- **Write path**: `{type: '@@HENSEI_SAVE_DATA', title, fleets: SavedFleetData}` sets `data[title]`, replacing any existing record. hensei-nikki watches its state and persists it with poi's `FileWriter` to `<APPDATA>/hensei-nikki/<member id>.json`.
- **Expansion slot**: hensei-nikki builds records from game data with `slots.ex = {id: api_slot_ex}`. That is the **owned equipment's instance ID, not its master ID**, and it is set as a property on an array. `JSON.stringify` drops non-index array properties, so the expansion slot is probably lost when the file is saved and reloaded. Task 1.1 confirms this.

## Goals / Non-Goals

**Goals:**
- Use hensei-nikki's data as a snapshot source, and its own action as the only write path. Never touch its file directly.

**Non-Goals:**
- Changing hensei-nikki, or relying on behaviour it doesn't already have.
- Making the expansion slot round-trip if hensei-nikki's own storage can't hold it.

## Decisions

### D1. Go through poi's store, not the file
Read with a selector on the extension state, and write by dispatching `@@HENSEI_SAVE_DATA`. hensei-nikki stays the only writer of its file, its UI updates straight away, and it handles the account (member ID) and file timing itself.
- *Alternative*: read and write `<APPDATA>/hensei-nikki/<member id>.json` directly. Rejected because two writers can race, hensei-nikki would not see the change until it reloads, and a later save from hensei-nikki would overwrite ours.

### D2. Isolate the coupling in one adapter
`src/hensei/adapter.ts` owns the state path, the version check (`poi-h-v1`), the action type, and the conversion between records and snapshots in both directions. It returns `unavailable` when the extension key is missing or the init flag isn't set. Any shape it doesn't expect counts as unsupported, never as a crash.

### D3. Filling in values hensei-nikki doesn't store
Modernization is copied from the owned ship with the same ship ID, choosing the same level first and otherwise the highest level. Ships the player no longer owns get modernization 0. HP is full, and morale is the default. These choices are stored on the snapshot as `provenance` flags, which the fleet view shows as markers. Without this, a record fleet would quietly simulate weaker than the real fleet, because luck and anti-air modernization affect night battle and anti-air cut-ins.

### D4. Writing records
The snapshot becomes `{version: 'poi-h-v1', fleets: [fleet], note}`, with slots `{id, lv, alv?}`, `lv` and `soku` copied from the snapshot's master data, and `saku` from the captured ship stats. The expansion slot is written in hensei-nikki's own form (`slots.ex = {id: <owned instance id>}`) only for snapshots taken from live fleets. It is left out otherwise. Before dispatching, the panel checks `title in data` and asks for confirmation if it exists.

## Risks / Trade-offs

- [hensei-nikki changes its state path, version, or action] → The adapter reports `unsupported` and the integration hides itself. Minimum tested version is v5.0.5.
- [The expansion slot doesn't survive hensei-nikki's own save] → Treated as missing on read and flagged on the ship. This is a limitation in hensei-nikki, documented, and not worked around.
- [Ship-matching guess for modernization is wrong, e.g. two copies of a ship with different modernization] → The marker on the ship makes the guess visible. A per-ship picker can come later if players ask for it.

## Open Questions

- Whether hensei-nikki ever kept the expansion slot in saved files (task 1.1). This only affects what is shown as missing.
