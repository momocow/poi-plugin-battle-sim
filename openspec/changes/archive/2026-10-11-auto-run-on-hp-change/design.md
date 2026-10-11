## Context

`Panel.tsx` has two automatic-run triggers that share one pending timer through `scheduleAuto`:
- The **input-change effect** keys the fleet id, `fleetLoadout(...).key`, the map, the choices and the trials. On every key or Auto change it clears the timer, then schedules a run when the key changed after the first one seen, with Auto on and the loadout complete.
- The **focus effect** schedules on a not-shown → shown edge.

`fleetLoadout` deliberately leaves HP out of its key today, so a sortie does not change it. The run itself reads HP from the store when the timer fires (`snapshotFleet` → `hp_now` in the TOML).

poi updates `info.ships[*].api_nowhp` on these responses:
- between nodes (`ship_deck`);
- on port (sortie return, finished dockings, a repair ship's repair);
- on `ndock` (a finished docking);
- on an instant repair (`nyukyo/start` with a bucket, `nyukyo/speedchange`);
- on a modernization or a marriage.

Nothing updates HP on a timer.

## Goals / Non-Goals

**Goals:**
- Any HP change in the selected fleet is a qualifying change, handled exactly like a ship or equipment change.

**Non-Goals:**
- Bringing the plugin's tab forward on an HP change. That is `focus-on-selected-fleet-change`.
- Simulating the rest of a sortie in progress.
- Morale, level or proficiency as triggers.

## Decisions

**Put HP in the loadout key.** Each ship's part of `fleetLoadout`'s key gains its `api_nowhp`. The input-change effect then treats an HP change like any other change, with no new code path: the debounce, the gates, cancel-and-restart, and the one-shot handling of changes made while Auto is off. An HP change during the delay restarts the wait, as the spec requires of every change. The alternative was a separate HP map with its own effect, which the first version of this change had for rises only. With every change counting, that would duplicate the key path. Level, morale and proficiency stay out of the key.

## Risks / Trade-offs

- [Every node of a sortie starts a run] → the optimizer runs in the background during battles, and each node cancels the run before it. This is accepted so that the result matches the fleet.
- [A run mid-sortie simulates the selected map from its start with the current HP] → the odds show "this damaged fleet, sortied again", not the rest of the sortie in progress. This is a limitation of what the panel models, out of scope here.
- [A repair ship's repair raises HP on each port load] → at most one run per load, after the delay.
- [A stale result is not dimmed for an HP change] → the dimming compares the inputs only. The new run replaces the result after the delay, so this is left as is.
