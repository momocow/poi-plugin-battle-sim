## Why

A route card shows only the results at the target. It doesn't say what happens at the nodes before it: which formation the fleet fights in, whether its special attack can fire there and use up its once-per-sortie charge, or how each battle tends to go. Those are what decide a node's formation setting, and today the user has to guess them.

## What Changes

- Hovering over a node on a finished route card shows a tooltip for that node on that route. It starts with the node's type: Normal battle, Night battle, Air battle, Air raid, Submarines only or Submarines mixed for a battle node, and Maelstrom or No battle for the others. A node without a battle then shows its reach rate; a battle node shows:
  - the **reach rate** to that node, the share of the route's trials that got there;
  - the **formation** the fleet fought in there: the run's formation for the node, downgraded for the fleet's ship count as the optimizer does;
  - the **special attack**: which one the fleet can fire there, for example "Nelson Touch", or that none can fire. This comes from the optimizer's static gates: the flagship, the formation, the partner ships, the surface ship count, night battle for the 金剛型 attack, and whether it already fired earlier in the sortie;
  - **S, A and B** at that node, among trials that fought there, following the rank display setting (A/B, or A+/B+).
- Every simulation asks the optimizer for the per-node rank channel (`ranks-per-node`). Until now only a node target asked for it. Collecting it costs nothing.
- Hovering a node no longer shows the route text. Hovering the stepper elsewhere still does.
- No optimizer change. The special-attack check mirrors the optimizer's documented gate table and reads `attack_special` from the optimizer's bundled `ships.json`.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `simulator-panel`: the Route cards requirement gains the per-node tooltip.
- `battle-simulation`: every route's simulation asks for the per-node rank results. A new requirement covers whether a special attack can fire at a node.

## Impact

- `src/optimizer/config.ts`: always request `ranks-per-node`.
- `src/optimizer/run.ts` / `src/ui/state.ts`: a route row carries, per simulated battle node, its formation and the special attack that can fire there.
- New `src/fleet/specialGates.ts`: the static gate check, mirroring `kancolle-fleet-optimizer/src/simulator/special_attack_fleet.md`. New loader for `attack_special` from `<dataDir>/ships.json`.
- `src/ui/runner.ts`: compute the per-node info for each route it simulates.
- `src/ui/RouteCards.tsx`, `src/ui/views.ts`, `src/ui/styles.ts`: the tooltip.
- `i18n/*.json`: special-attack names and the tooltip labels.
- Risk: the gate mirror can drift from the optimizer when that project changes its gates.
