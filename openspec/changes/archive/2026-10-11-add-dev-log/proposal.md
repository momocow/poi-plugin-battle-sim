## Why

Some behavior can only be checked after it happens in the game: a special attack that fires once in many sorties, a mid-sortie run's narrowing, an automatic run that started or didn't. The sortie log added for `deduce-route-mid-sortie` showed the value of a file to check afterwards. But it is always on, and it only covers sortie events. A developer log, off unless asked for, can cover the plugin's main steps in detail without writing anything for users who don't need it.

## What Changes

- A new poi config flag, `plugin.poi_battle_sim.devLog`, off by default, with a switch on the plugin's settings page that names the log file.
- While it is on, the plugin writes one JSON line per event to `<poi app data>/battle-sim/logs/dev.ndjson`:
  - sortie events: start, port, and each battle's raw shelling fields with the special attacks recorded from them;
  - each run: its input and fleet snapshot, the predicted routes, the mid-sortie narrowing, each route's optimizer config and result summary, and how the run ended;
  - automatic runs: when one is scheduled, and by which trigger.
- While it is off, nothing is written.
- The always-on `sortie.ndjson` from `deduce-route-mid-sortie` is replaced by this log.
- The file is kept to about 2 MB, with one older file kept.

## Capabilities

### New Capabilities

- `developer-log`: an opt-in log of the plugin's main steps, for checking behavior after it happens.

### Modified Capabilities

_None._

## Impact

- `src/fleet/sortie-log.ts` becomes `src/devlog.ts` (`devLog(event, data)`), gated by the flag.
- `src/fleet/specials.ts`, `src/ui/runner.ts` and `src/ui/Panel.tsx` call it.
- `src/ui/inputs.ts` (the flag key and its reader), `src/ui/Settings.tsx` (the switch), and i18n for its label and hint.
- `deduce-route-mid-sortie`'s design and tasks point to this log instead of `sortie.ndjson`.
