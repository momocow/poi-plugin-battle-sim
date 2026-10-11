## 1. Footer

- [x] 1.1 In `src/ui/ResultFooter.tsx`, remove the stale-note `<div>`. Pass `stale` to `ResultLine`, and when it's set, end the line with a `Tooltip` marker: `Icon` `history`, size 12, class `battle-sim-footer-marker`, tooltip "Settings have changed since this result", placed after the unobserved-sortie marker. Update the module comment.

## 2. Verify

- [x] 2.1 Run the test suite (the i18n table test still finds the string) and the type check.
- [x] 2.2 In poi:
  - After a run, change the map. The footer's result line dims and gains the marker without moving, and the route list keeps its height. Hovering shows the note.
  - Run again: the marker goes away.
