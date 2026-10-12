## Why

The control panel above the fleet display has grown one feature at a time, and its rows no longer read in a useful order. The first row mixes inputs (fleet, map) with actions (Simulate, Reset, Auto) and the mode tag. The phase sits on a separate row from its map. The target and its Night battle switch get a row of their own, apart from the branch choices that also shape the route. Grouping the inputs on the left and the mode and actions on the right makes it clear what is being set and where to act.

## What Changes

- The controls become rows, each wrapping when it doesn't fit:
  1. the Fleet dropdown, the Map dropdown and the Phase dropdown (on maps that have one), with the Plan mode / Sortie mode tag floating right; the Fleet dropdown is capped in width so a long fleet name doesn't wrap the row;
  2. the branch choices after a new "Route" (路線) label, then the Target dropdown and the Night battle switch, which wrap together; this row is left out when empty;
  3. the action bar: Reset at the left; Auto and Simulate (Cancel while running, at the same width) floating right.
- Only the mode tag and the action bar's Auto and Simulate float right; everything else keeps to the left.
- Reset stays a minimal icon-only ↺ button, as it is rarely used, with a tooltip naming it "Reset" and saying what it does in place of its plain hover text.
- The controls' buttons and dropdowns become 24px tall, 20% shorter than Blueprint's default.
- Auto gets a tooltip like Reset's, adding that in sortie mode it simulates again at each node the fleet reaches, with the supplies used and the damage taken, as it is what keeps a sortie's prediction current.
- The Plan mode / Sortie mode tag gets a tooltip like Reset's and Auto's, its name and the old hover text.
- Simulate is primary only while Auto is off, as with Auto on runs start by themselves.
- No behavior changes: what each control does, when it is enabled, and what is remembered all stay the same.
- A spec fix rides along: the "Result after advancing" scenario still said "with a note" for a stale result. The stale note became a footer marker in `inline-stale-footer-note`, so the scenario now says marker.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `simulator-panel`:
  - "Narrow, top-down layout": describes the controls' three rows.
  - "Mid-sortie runs": places the mode tag at the right end of the fleet row, gives it a tooltip, and fixes the stale wording in its "Result after advancing" scenario.

  The Reset button's look is described in the layout requirement, so "Selection reset" is unchanged.

## Impact

- `src/ui/Controls.tsx`: the JSX is restructured into the rows; `TargetRow` becomes `TargetControls` at the end of the Route row; the Reset button gets its tooltip. Props are unchanged.
- `src/ui/styles.ts`: float-right and action-bar classes, and 24px controls.
- One new string, the Auto tooltip's sortie line, in all three languages. "Reset" and "Route" (路線) already exist.
- No changes to state, runner or tests beyond what the layout touches.
