## Context

`ResultFooter` renders the stale note as a `<div>` under `ResultLine`, inside `.battle-sim-footer-result`. The footer is `flex: none` at the bottom of a column whose route list scrolls, so every extra footer line takes height from the route list and moves the result line up. `ResultLine` already ends with an inline `Tooltip` marker (`eye-off`, class `battle-sim-footer-marker`) for a sortie not observed from its start.

## Goals / Non-Goals

**Goals:**
- The footer's height doesn't change when a result goes stale or fresh.

**Non-Goals:**
- Changing when a result counts as stale, or the dimming.
- A footer line that can never wrap. A long result line may still wrap at narrow widths, as it does today.

## Decisions

**Reuse the inline marker pattern.** `ResultLine` takes `stale` and, when it's set, ends with a second `Tooltip` marker after the unobserved-sortie one: `Icon` `history` at size 12, with targetTagName `span` and class `battle-sim-footer-marker`, and the tooltip "Settings have changed since this result". The icon is muted rather than warning-colored: staleness is routine, not a problem, and the triangle and download icons are already taken by warnings. *Alternative:* keep the text but reserve its line permanently. Rejected: that costs a line of route-list height all the time.

**The marker sits inside the dimmed line.** It inherits the 0.5 opacity of `.battle-sim-stale`, so it reads as part of the stale result rather than as a separate alert. The tooltip renders in a portal and isn't dimmed.

## Risks / Trade-offs

- [The note is no longer readable without hovering] → The dimming already says "out of date" at a glance. The marker shows the line is stale on purpose, and the tooltip gives the reason, as the unobserved-sortie marker does.
