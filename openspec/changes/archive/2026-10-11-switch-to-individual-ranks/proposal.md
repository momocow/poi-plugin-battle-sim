## Why

The summary and route cards show cumulative rates — S, A or better (S + A), B or better (S + A + B) — so the A and B figures repeat the S share and the user has to subtract to see how often each rank actually happens. Individual rates (S, A, B) read directly as a rank distribution, but the cumulative view still answers "how often do I at least get A / a victory", which matters for quests with an A-or-better or victory condition. So the panel offers both, chosen in poi's config, with individual as the default.

## What Changes

- A new poi config setting, **rank display**, with two values: `individual` (default) and `cumulative`. Any other or missing value counts as `individual`. The plugin's settings page gets a control for it, and a change takes effect in the open panel at once, without re-running.
- **Individual**: the summary's primary values are **S**, **A** and **B**, each the chance per sortie of exactly that rank, with its rate when the boss is reached; route cards show S, A, B and boss sunk, labelled `A` / `B`.
- **Cumulative**: today's display, unchanged — **S**, **A or better**, **B or better** in the summary, `A+` / `B+` on the route cards.
- **BREAKING** (display default only): users who never touch the setting will see the individual rates, so their A and B numbers drop compared with before. Nothing persisted or sent to the optimizer changes.
- Route card ordering is unaffected by the setting: by weighted S, then A or better, then B or better, which orders cards the same as S, then A, then B.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `simulator-panel`: the summary and route cards show ranks individually or cumulatively per a new rank-display setting, defaulting to individual; the setting is on the plugin's settings page.

`battle-simulation` is unchanged: it already provides each rank's probability (S–E) and the cumulative rates, overall and when the boss is reached.

## Impact

- `src/ui/inputs.ts`: config key, type and loader for the rank display.
- `src/ui/views.ts`: cells built for the chosen mode; `src/ui/Summary.tsx`, `src/ui/RouteCards.tsx`: mode-dependent labels and values; `src/ui/Panel.tsx`: reads the setting from poi's store so it updates live.
- `src/ui/Settings.tsx`: the control.
- `i18n/*.json`: `A` / `B` labels and the setting's text.
- `test/views.test.ts`, plus the loader's tests.
