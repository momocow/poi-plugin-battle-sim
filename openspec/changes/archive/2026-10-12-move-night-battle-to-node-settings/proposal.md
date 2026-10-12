## Why

The Night battle switch sits next to the Target dropdown and reads like a setting for the whole sortie, but it only affects the target node. Runs send night battle for the target and nothing for the nodes before it. Night battle is a per-node decision, like the formation, and the 陣形 popup already lists every battle node. Moving night battle there makes the scope obvious. It also makes it possible to pursue night battle at a node before the target, which the optimizer already supports.

## What Changes

- **BREAKING (UI)**: the Night battle switch is removed from the control row. The Target dropdown stays as it is.
- The 陣形 button is renamed **逐點設定** (Node settings), and its popup becomes a per-node settings editor. Each battle-node row gets a **夜戰** dropdown next to the 陣形 select, with three options:
  - **如果為目標點** (if target), the default: pursue night battle only when the node is the target;
  - **總是** (always);
  - **絕不** (never).
- Night-battle-only nodes show 總是, locked, because the battle there is always a night battle. Air raid nodes show 絕不, locked, because they have no night phase.
- 夜戰 choices are remembered per map and node, like 陣形. They apply when the popup closes, as 陣形 does, and Reset all to default clears them too.
- Each simulation sends night battle for every battle node on the simulated part of the route (air raids excepted), not just the target.
- The footer's "No night battle" note now means the night battle at the target was off.
- The saved global Night battle switch (`plugin.poi_battle_sim.nightBattle`) is no longer read. A user who had it off gets night battle at the target again, the new default, until they set 絕不 on the nodes they want.
- A sortie on another map keeps its own target, which starts at Boss; there is no longer a switch to keep alongside it.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `battle-simulation`: night battle is decided per node from the node settings, not from a switch at the target.
- `simulator-panel`:
  - the Night battle switch is removed from Inputs, Automatic runs, Mid-sortie runs, Result footer, Narrow layout and Selection reset;
  - the Node formations requirement is renamed Node settings and gains the 夜戰 dropdown;
  - the button is renamed 逐點設定.

## Impact

- `src/routes/formation.ts` (or a sibling module): the per-node night battle setting and its effective value.
- `src/optimizer/config.ts`: `do_night_battle` written per battle node from a map of booleans, not only at the target.
- `src/ui/runner.ts`, `src/ui/state.ts` (`RunInput.nightBattle` boolean → per-node settings), `src/ui/views.ts` (`isStale`), `src/ui/ResultFooter.tsx`.
- `src/ui/inputs.ts`: new `nightBattles` key per map; stop reading `nightBattle`.
- `src/ui/Panel.tsx`, `src/ui/Controls.tsx` (switch removed, sortie pair reduced to a target), `src/ui/FormationEditor.tsx` (renamed node settings editor), styles and i18n.
- Tests: config, inputs, views, formation (or node-settings) tests.
