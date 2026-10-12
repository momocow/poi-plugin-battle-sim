## Why

The second control row now holds the branch choices (能動分歧), then the Target dropdown, the Night battle switch and the 陣形 button. On a map with several branches, such as 7-5, it wraps at an arbitrary point. That mixes two different things on the same lines: how the fleet routes, and what the sortie aims at and how it fights. Giving each its own row makes the panel easier to scan and keeps the target group in the same place on every map.

## What Changes

- The branch choices keep their row, after the 能動分歧 label, shown only on maps that have them.
- The Target dropdown, the Night battle switch and the 陣形 button move to a row of their own, below the branch choices. It is shown only once the map's topology is cached, as now.
- Either row is hidden when it would be empty, so a map without branch choices shows only the target row, and a map whose topology isn't cached yet shows only the branch row (or neither).
- The layout requirement now names the 陣形 button, which it didn't mention before.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `simulator-panel`: the Narrow, top-down layout requirement splits the second control row into a branch row and a target row, and includes the 陣形 button.

## Impact

- `src/ui/Controls.tsx`: render the target group in its own row. Update the header comment.
- `src/ui/styles.ts`: check that the target group still wraps as one unit; the comment there names the old row.
- No behavior, persistence or optimizer change.
