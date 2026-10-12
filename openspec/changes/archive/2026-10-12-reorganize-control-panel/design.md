## Context

Before this change, `Controls.tsx` rendered `.battle-sim-controls` as a flex column of wrapping `.battle-sim-control-row`s:
1. Fleet, Map, Simulate/Cancel, an icon-only Reset, Auto, then the mode `Tag` pushed right;
2. `TargetRow`: Target and Night battle, shown once the map's topology is cached;
3. the branch selects, then Phase.

All the behavior is in the props and handlers: what is disabled when, the empty choice after Reset, the taken-branch tooltips, and the night-only lock. The JSX only decides placement.

## Goals / Non-Goals

**Goals:**
- The rows as specified, with no change to any control's behavior, props or handlers.
- Only the mode tag and the action bar float right, and the action bar stays on one line.

**Non-Goals:**
- A fixed control-panel height. The Route row wraps on maps with many choices or at narrow widths, is left out on maps with none, and the panel's height follows.
- Changing labels or strings, apart from Auto's new tooltip line and the routes gaining the existing "Route" label.

## Decisions

**Rows stay wrapping flex rows (`.battle-sim-control-row`), with float-right by `margin-left: auto`.**
1. **Fleet row:** Fleet, Map and Phase, then a `.battle-sim-float-right` wrapper around the mode `Tag`. `margin-left: auto` pushes it to the right end. The Fleet select is capped at 9em (`text-overflow: ellipsis`), as the map select is fixed at 5.5em, so a long in-game fleet name doesn't wrap the tag onto a line of its own.
2. **Route row:** "Route" (`t('Route')`: 路線 / ルート, shown only with branches) and the branch selects, then `TargetControls`, the old `TargetRow` as a `.battle-sim-target` span that doesn't wrap inside, so Night battle never lands alone on a line and Target doesn't read as another branch. It renders only when there are branches or target controls, so an empty row adds no gap.
3. **Action bar:** `.battle-sim-actions`, a row that doesn't wrap: Reset at the left, then a `.battle-sim-float-right` `.battle-sim-run` group of Auto and Simulate at the right.

**Action bar: Reset at the left; Auto and Simulate at the right.** Reset clears the fleet and map with no undo, so the panel's width separates it from Simulate, the usual toolbar layout with the destructive action apart from the main ones. Simulate comes last, at the right end where the eye lands. The bar looks the same on every map and at every width. Simulate and Cancel are one `Button` whose label holds both strings in one grid cell, the inactive one `visibility: hidden`, so it keeps its width in every language and Reset doesn't shift when a run starts. Simulate is primary only when clicking it is the way to run: with Auto on, runs start by themselves, so it shows in the default color; Cancel shows in the default color too, as before.

*Alternatives tried during review:*
- The action bar at the end of the Route row, wrapping onto a line of its own when it doesn't fit, with Reset beside Auto set apart by a wider gap. Dropped: it saves a row only on maps with few branches, where there are few route cards and the room matters least, as on maps like 7-5 the bar wraps at 400px anyway; it put Reset close to Simulate; and the bar changed shape by map and width.
- A two-column grid (inputs left, tag top-right, actions bottom-right), with reserved rows for a fixed height. Replaced at the user's request by this row layout, which reads top to bottom and gives the inputs the full width.
- CSS `float`. Rejected: inside flex rows, `margin-left: auto` is the flex equivalent and needs no clearing.

**Controls at 24px.** The buttons and dropdowns in the controls are 24px tall, 20% under Blueprint's default 30px and the same as its small size. This is set by CSS scoped to `.battle-sim-controls`, not per component, so the fleet display, cards and settings page keep the default, and the rule doesn't depend on which size props poi's Blueprint build accepts. The select's arrow icon is re-centered (`top: 4px`). Switches and the mode tag keep their size.

**Reset: `<Button variant="minimal" icon="reset" />` in a `Tooltip`.** Reset is rarely used, so it's as quiet as it can be: an icon with no border or fill. Its name and what it does move from the label and the `title` into one Blueprint tooltip ("Reset", then the old hover text), and the button gets `aria-label` "Reset". As with the taken branches, a disabled button gets no mouse events, so the tooltip's target is a span (`.battle-sim-reset`) and the disabled button lets the pointer through to it; the tooltip shows while Reset is disabled, too, saying what it would do. Blueprint 6 replaces the `minimal` / `outlined` booleans with `variant`; poi's build renders it, as checked in poi. The disabled conditions are kept.

**Auto's tooltip.** Auto is what keeps a sortie's prediction current: with it on, the panel simulates again in sortie mode as the fleet reaches each node, uses supplies and takes damage. Its plain `title` becomes a Blueprint tooltip like Reset's: "Auto" in bold, the old hover text, then a new line saying so (one new string, in all three languages, using each one's word for a node: 點, マス).

**The mode tag's tooltip.** The tag's plain `title` becomes a Blueprint tooltip like Reset's and Auto's: the mode's name in bold, then the old hover text, so the controls' hover help looks the same everywhere. It opens below the tag, as the tag is at the top of the panel. No new strings.

*Alternative tried:* an outlined button labeled "Reset". Dropped: at the size of Simulate, it drew the eye to an action used once in a while.


## Risks / Trade-offs

- [The Route row on 7-5 (three branches, Target, Night battle) wraps at 400px, and on a map with no branches and no cached topology it's absent, so the panel's height varies by map] → It's the only row that changes, and only the route list gives up the height, which scrolls. A fixed height was tried and dropped for this simpler layout.
- [The action bar sits below the Route row, so it moves down when that row appears, as after a map's first run fetches its topology] → The startup prefetch caches the normal maps in the background, so this is mostly on event maps.
- [The action bar takes a row even where the Route row's last line has room for it] → That's on maps with few branches, which have few route cards.
- [Reset, alone at the left under the branch selects, could read as part of the Route row] → It's a minimal icon with a tooltip; checked in poi.
- [A long fleet name is cut short in the closed select] → The open list shows the full names, and the fleet number leads the label.
