## 1. Layout

- [x] 1.1 In `src/ui/Controls.tsx`, restructure the JSX into rows:
  - **Fleet row:** Fleet, Map, Phase, with the mode `Tag` in a `.battle-sim-float-right` wrapper.
  - **Route row**, only when not empty: "Route" (only with branches) and the branches, then `TargetControls` (`TargetRow` turned into a fragment).
  - **Action row** (`.battle-sim-actions`): Reset, Simulate/Cancel, Auto.
  
  Keep every prop, handler, disabled condition and tooltip as is. Update the module comment.
- [x] 1.2 Make Reset a minimal icon-only button (`variant="minimal"`, `icon="reset"`, `aria-label`) in a `Tooltip` with "Reset" and the old hover text, its target a `.battle-sim-reset` span that a disabled button lets the pointer through to. Keep its disabled rule.
- [x] 1.3 In `src/ui/styles.ts`, set the controls to a column of rows. Add `.battle-sim-float-right` (`margin-left: auto`) and `.battle-sim-actions` (`justify-content: flex-end`, `flex-wrap: nowrap`), drop `.battle-sim-mode`'s `margin-left: auto`, and update the CSS comment.
- [x] 1.4 Make the controls' buttons and dropdowns 24px tall (20% under 30px) with CSS scoped to `.battle-sim-controls`, and re-center the select arrow.

## 2. Review follow-ups

- [x] 2.1 Keep the action bar a row of its own (`.battle-sim-actions`, no wrap), the Route row rendering only when not empty.
- [x] 2.2 Put Reset at the action bar's left, and Auto then Simulate in a `.battle-sim-float-right` `.battle-sim-run` group at its right.
- [x] 2.3 Wrap `TargetControls` in a `.battle-sim-target` span that doesn't wrap inside.
- [x] 2.4 Cap the Fleet select at 9em with `text-overflow: ellipsis`.
- [x] 2.5 Make Simulate / Cancel one `Button` whose label stacks both strings in one grid cell, the inactive one hidden.
- [x] 2.6 Make Simulate primary only while Auto is off and no run is in progress.
- [x] 2.7 Give Auto a `Tooltip` like Reset's, with the old hover text and a new sortie line in all three languages, replacing its `title`.
- [x] 2.8 Give the mode tag a `Tooltip` with the mode's name and its old hover text, placed below, replacing its `title`.

## 3. Verify

- [x] 3.1 Run the test suite and the type check.
- [x] 3.2 In poi, at about 400px wide and at a wider width, check:
  - 7-5 with its topology cached: the first row reads 艦隊, 海域 with the tag at its right end; the Route row reads 路線 with F →, H →, O →, then 目標 and 夜戰 on the same line, wrapping from the left; the last row with Reset at the left end and Auto and Simulate at the right end.
  - A map with a phase: the Phase dropdown follows the Map dropdown on the first row.
  - A map with no branches whose topology isn't cached yet: no Route row, and no gap.
  - Reset alone at the left of the action bar doesn't read as part of the Route row.
  - A long fleet name with a phase map at 400px: the name cut short, the fleet row on one line.
  - Reset: an icon with no border; hovering shows "Reset" and what it does, also while disabled (after Reset, and in sortie mode).
  - Auto: hovering shows "Auto", the old hover text and the sortie line, in all three languages.
  - Auto on: Simulate in the default color; Auto off: primary.
  - Simulate → Cancel: the button keeps its width in all three languages, and Auto doesn't move.
  - Sortie mode: the red tag at the right of the fleet row, and the selects locked.
  - The mode tag: hovering shows the mode's name and what it means, below the tag, in plan mode and in sortie mode.
  - A run in progress: Cancel in the action bar, Reset still usable.
  - After Reset: the empty choices, and Reset disabled.
  - No horizontal scroll at 400px, the action bar on one line, and the 24px controls with centered select arrows.
