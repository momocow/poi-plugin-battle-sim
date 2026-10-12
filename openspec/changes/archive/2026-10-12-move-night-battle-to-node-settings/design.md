## Context

- `RunInput.nightBattle` is one boolean. `simulateToml` writes `do_night_battle` only in the target's `[tactics.nodes.<target>]` table. The Panel forces it on at a night-battle target (`nightOnlyNodes`).
- The optimizer reads `do_night_battle` per node: it is required at a boss, defaults to `false` elsewhere, is forced on at a night-battle node, and gets a WARN and is ignored at an air raid.
- The Node formations popup (`FormationEditor.tsx`) already lists every battle node of the shown map. It keeps a draft that is saved on close and then starts one run. Formations are saved per map under `plugin.poi_battle_sim.formations`.
- A sortie on another map has its own `{ target, nightBattle }` pair in Panel state.

## Goals / Non-Goals

**Goals:**
- One per-node settings editor holding formation and night battle, sharing the draft-on-close flow.
- `do_night_battle` written for every battle node in the simulated slice, computed in one place.

**Non-Goals:**
- Moving the target into the popup (the Target dropdown stays).
- Per-node settings other than formation and night battle.
- Carrying the old switch value over.

## Decisions

### Data model: two sibling stores, absent = default
- `NightBattle = 'always' | 'never'`. **If target** is the absence of an entry, as Default is for formations. The saved shape has no third value, and Reset all to default stays "clear the map's entries".
- Saved under a new key, `plugin.poi_battle_sim.nightBattles` = `{ [map]: { [letter]: NightBattle } }`, validated on load like `formations`.
- `RunInput.nightBattle: boolean` is replaced by `RunInput.nightBattles: Record<string, NightBattle>` (the run map's entries). `isStale` compares it like `formations`.

Alternative: one `nodeSettings` record per node `{ formation?, nightBattle? }` under a single key. Rejected: it would mean migrating the `formations` key that was just released. The two stores share the map / letter / absent-is-default shape, so the editor still treats them as one draft.

### Effective value computed once
`nodeNightBattle({ setting, isTarget, color })` returns `true`, `false` or `undefined` (send nothing):
- air raid (colour 10) → `undefined`;
- night-battle node (colour 11) → `true`;
- `always` → `true`, `never` → `false`, absent → `isTarget`.

The runner builds `nightBattles: Record<letter, boolean>` for each route's simulated slice. `simulateToml` takes it instead of `nightBattle` and writes `do_night_battle` into each node's table, alongside `formation`. It still writes `do_night_battle = true` at the target when the topology isn't cached (the first-run case), matching If target at the boss.

The footer's "No night battle" note reads the target's effective value. That value is stored on the run's state when the run starts, so the footer doesn't need the topology.

### Editor: rename and add a column
`FormationEditor.tsx` becomes `NodeSettings.tsx`, and `FormationsButton` becomes `NodeSettingsButton`. The draft becomes `{ formations, nightBattles }`, the close check compares both, and `onClose` hands both back. The 夜戰 select for a night-battle or air raid node is a disabled select showing Always / Never, wrapped in a tooltip span, as the branch controls do. Panel's `applyFormations` becomes `applyNodeSettings`: it saves both keys, records the auto key, and starts the run.

### Removing the switch
- `TargetPair` shrinks to `{ target }`.
- `BOSS_PAIR` drops `nightBattle`.
- `SavedInputs.nightBattle` is removed and the key is no longer read or written. A stale key left in poi's config is harmless.
- `Controls.target` loses `nightBattle` / `nightOnly` and `onNightBattle`, and the `'{node} is always a night battle'` tooltip moves to the editor.

## Risks / Trade-offs

- [A user who had the switch off silently gets night battle at the target again] → Stated in the proposal; the footer shows when night battle was on or off, and setting 絕不 on the boss restores it per map. Mapping one global flag onto per-node settings for every map would guess at intent.
- [Wider popup rows with two selects on a 400px panel] → The popup is a portal, not bound to the panel width. If it's too wide, the reason column can wrap under the letter. This is checked in the poi verification task.
- [Sending `do_night_battle = false` at many nodes is noisier in the TOML] → It's explicit and matches what the optimizer defaults to. Only air raids are left out, to avoid its WARN.

## Migration Plan

No data migration. `nightBattles` loads as `{}`, and `nightBattle` is ignored. Rollback restores the switch, reading `nightBattle` as on unless it was saved off.
