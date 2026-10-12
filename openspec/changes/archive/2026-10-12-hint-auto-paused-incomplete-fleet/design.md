## Context

Whether Auto may run is decided in `Panel.tsx` by `loadout?.complete`, from `fleetLoadout` (`src/fleet/snapshot.ts`): at least one ship, and every present ship's main slots filled. The three auto triggers (change, focus, Auto turned back on) each check it. `shipCount` is already computed in the panel for the Node settings popup. The Auto switch and the Simulate button live in `Controls.tsx`, in the `battle-sim-run` group. Blueprint 6.12, which poi provides, gives `Switch` no `intent` prop: the checked colour is fixed to primary when Blueprint's stylesheet is built (`$switch-checked-background-color`).

## Goals / Non-Goals

**Goals:**
- One derived flag, `autoPaused`, computed where the gating already lives, so the hint and the gate cannot disagree.
- A warning-coloured Auto switch that keeps working in light and dark themes, with hover, active and disabled states.

**Non-Goals:**
- Naming which ship or slot is empty. The fleet display already shows the slots.
- Changing when runs start, or treating the expansion slot differently.
- A separate inline banner or message row. The action bar must not wrap, and the tooltip plus colour are enough.

## Decisions

- **Derive in Panel, pass a boolean.** `autoPaused = inputs.auto && loadout !== undefined && !loadout.complete && (shipCount ?? 0) > 0`. `complete` already folds in "no ships", and `shipCount` separates the empty fleet, which gets no hint. For a combined fleet, `shipCount` counts only the selected fleet id; this matches how `loadout` is built today (`[fleetId]`). If combined support widens `loadout`, the count follows the same ids. *Alternative:* add `count` to `Loadout`. That widens a shared type for one UI use, so not chosen.
- **Colour by class, not by a forked component.** Add a `battle-sim-auto-paused` class to the `Switch` and override the checked indicator in `styles.ts` with Blueprint's warning palette: the `$orange3`/`$orange2`/`$orange1` family Blueprint uses for warning intents, with the disabled state at 50% alpha, mirroring how Blueprint styles primary. Selectors are scoped under `.battle-sim-run`, like the existing `.bp6-switch` rule. *Alternative:* swap to a `Checkbox` or a custom toggle with `intent`. That breaks visual consistency with poi.
- **Simulate intent.** It becomes `p.running || (p.auto && !p.autoPaused) ? 'none' : 'primary'`. The existing comment ("Primary only when it is the way to run") already states the rule; paused Auto is just another case where clicking is the way to run.
- **No MODIFIED requirements.** The behaviour is spelled out in a new requirement that refers to *Automatic runs* and *Narrow, top-down layout* instead of rewriting them. Those two blocks are already being modified by `move-night-battle-to-node-settings`, and two full-block MODIFIED deltas would overwrite each other at archive.

## Risks / Trade-offs

- [Blueprint changes its class names or the indicator markup in a poi upgrade] → The override silently stops applying and the switch falls back to blue. The tooltip still carries the hint. The selectors use the same `bp6-` prefix the plugin already depends on.
- [Orange next to the red Sortie mode tag reads as alarming] → It is on a different row, and orange is Blueprint's standard "needs attention" colour, not an error colour.
- [A one-render lag between the store updating and the hint] → Both come from the same `live` selector in one render, so there is none in practice.
