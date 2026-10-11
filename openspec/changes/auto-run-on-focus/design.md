## Context

`Panel.tsx` owns automatic runs in one effect: it keys the inputs (`fleetId`, loadout key, map, choices, trials), and when the key changes after the first one seen, with Auto on and the loadout complete, it schedules `simulate` after `loadAutoRunDelay()`; the effect's cleanup clears a pending timer, which is what makes rapid changes settle into one run. The panel stays mounted while poi shows another tab, so "coming into view" is not a mount.

poi records the shown tab in its store: `ui.activeMainTab` is the tab in the main area (a plugin's id when a plugin tab is shown there), and in the double-tabbed layout (`config.poi.tabarea.double`) the plugin pane shows `ui.activePluginName`. A plugin's id is its package name, `poi-plugin-battle-sim`. poi's plugin auto switch changes the same fields, on the same game response that updates the fleet, so a focus and an in-game change arrive within a few milliseconds of each other in either order.

The run state is `idle` before any run and again after a cancel ("nothing kept"); every other phase means the panel has a run (see specs/simulator-panel/spec.md).

## Goals / Non-Goals

**Goals:**
- One run, not two, when a focus and a qualifying change arrive together.
- A focus is a one-shot event: it never leaves a run pending for a later fleet or data change.

**Non-Goals:**
- Reacting to the poi window gaining OS focus, or to a separate plugin window (this plugin is not `windowMode`).
- Re-running a stale result on focus.

## Decisions

**Read visibility from poi's store, not DOM/visibility APIs.** A pure helper `isPluginShown(state)` returns `double ? ui.activePluginName === PLUGIN_ID : ui.activeMainTab === PLUGIN_ID`, selected with `useSelector`. The store is the source of truth poi itself renders from; `IntersectionObserver` or `document.visibilityState` would also fire on window minimise/restore, which is not what was asked. `PLUGIN_ID` is the package name, kept as a constant next to the other poi identifiers (`PREFIX` in `inputs.ts` is a config path, not the id, so it is not reused).

**Detect focus as a not-shown → shown edge.** A focus effect depends only on the shown flag and compares it with a `lastShown` ref that starts false, so both a tab switch into view and a mount while already in view count. It updates the ref before checking anything else, so a focus while the game data is still loading, Auto is off, or the fleet is incomplete is consumed and does not fire later.

**Two effects, one timer.** The pending automatic run lives in a ref (`autoTimer`) that both triggers share through `scheduleAuto`, which clears it before setting it. The input-change effect clears it on every key or Auto change, as its cleanup did before, and schedules when the key changed; the focus effect schedules when it sees a focus with Auto on, a complete loadout and `run.phase === 'idle'`, and otherwise leaves the timer alone. Whichever of a focus and its in-game change comes second replaces the first's timer, so they give one run, and that run reads the fleet when the timer fires. Alternatives considered: separate timers per trigger (two runs on an auto-switch swap), and making the shown flag a dependency of the input-change effect (its cleanup would then cancel a pending change run whenever the user switches tabs away). Using the auto-run delay for focus too, instead of starting at once, is what makes the ordering safe; the cost is up to one delay (1 s by default) before a focus run starts.

**`run.phase` is read, not depended on.** Adding `run.phase` to the focus effect's dependencies would re-schedule on every phase change. The effect reads the phase at the time of the focus only; a cancel while the tab is in view does not start a run (the user just asked to stop).

## Risks / Trade-offs

- [poi renames `ui.activeMainTab` / `ui.activePluginName` or the id scheme] → the helper returns false and focus runs silently stop; nothing else is affected. The helper is unit-tested against the current shapes so a fixture update makes the dependency visible.
- [The panel has a key change *and* a focus with an idle run, but Auto is off] → nothing starts, matching the spec's "then or later".
- [poi starts with the plugin tab shown before login] → the focus is consumed with no fleet, so the first run waits for the user to refocus, click Simulate, or change something. Accepted per the spec's "game data loading SHALL NOT start a run".
