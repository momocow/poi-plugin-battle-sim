## Why

When a result goes stale, the footer adds a second line, "Settings have changed since this result". The footer grows by that line, which pushes the result line up and takes height from the route list above. It happens every time the user changes the fleet, map, choices or target, so the layout jumps often.

## What Changes

- The stale note becomes a small marker at the end of the footer's result line. Hovering over it says "Settings have changed since this result". This is the same pattern as the existing marker for a sortie not observed from its start.
- The footer keeps a single line: the result line no longer moves when a result goes stale or fresh.
- The dimming of the result line, summary and route cards is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `simulator-panel`: the Result footer requirement now notes a stale result with a marker at the end of the result line, not a line of its own.

## Impact

- `src/ui/ResultFooter.tsx`: the note moves into `ResultLine` as a `Tooltip` marker.
- No new strings. The existing "Settings have changed since this result" becomes the tooltip text.
- No change to how staleness is decided.
