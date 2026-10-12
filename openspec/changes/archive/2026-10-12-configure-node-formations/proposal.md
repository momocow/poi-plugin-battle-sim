## Why

Every simulation today runs with the optimizer's default player formation, 単縦陣, at every node. That is wrong for most real sorties: players take 輪形陣 into air raids, 単横陣 against submarines, 梯形陣 at night-battle nodes, and pick other formations for special attacks (e.g. 複縦陣 for Nelson Touch). The rates the panel shows are therefore off exactly where formation matters most. The optimizer already accepts a per-node formation (`[tactics.nodes.<letter>] formation`), so the plugin only has to choose and send one.

## What Changes

- Each battle node gets a **default formation** from what kind of battle it is, read from the map's kcnav data. The first rule that matches wins, and the submarine rules are checked before the node's colour:
  - every enemy composition all submarines → 単横陣 (LineAbreast)
  - some enemy composition has a submarine → 梯形陣 (Echelon)
  - night-battle node → 梯形陣 (Echelon)
  - air battle or air raid node → 輪形陣 (Diamond)
  - otherwise → 単縦陣 (LineAhead)
- A **Formations** button next to the Night battle switch opens a popup editor that lists every battle node of the map at once. Each node shows its formation and the reason for its default, and has a select to override it.
- Overrides are remembered per map and node between poi sessions, until set back to Default.
- Formations the fleet's ship count can't use are greyed out, following the game rule the optimizer applies: with fewer than 4 ships only 単縦陣 is available, and 輪形陣 needs 5 ships. When a default or a remembered formation isn't available, the editor shows the formation the fleet actually gets.
- Each `simulate` config sends the formation of every battle node on the simulated part of the route.
- Edits made in the editor take effect when its popup closes. If any formation changed, one run starts at once, as if Simulate were clicked.
- Single fleet only: combined-fleet formations (CF1–4) are left to `add-combined-fleet-support`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `battle-simulation`: new requirement that each simulation sends a player formation per battle node. It covers the default rules and how node kinds are read from the kcnav data.
- `simulator-panel`: new requirement for the Formations editor: a popup listing the nodes, overrides, persistence, greying by ship count, and a run when the popup closes after a change.

## Impact

- `src/routes/topology.ts`: the node colour vote is generalized, so air-battle and air-raid nodes can be read alongside night-battle nodes.
- New formation module: the default rule, the ship-count limits, and reading a node's enemies from kcnav. Submarines are identified by ship type from poi's `const.$ships`.
- `src/optimizer/config.ts`: the `[tactics.nodes.<letter>]` tables carry `formation`.
- Also touched: `src/ui/runner.ts`, `src/ui/state.ts`, `src/ui/views.ts`, `src/ui/inputs.ts`, `src/ui/Panel.tsx`, `src/ui/Controls.tsx`, a new editor component, styles, and i18n (formation names in zh-TW / ja / en).
- The optimizer contract is unchanged: the pinned optimizer already supports `[tactics.nodes.<letter>] formation`.
