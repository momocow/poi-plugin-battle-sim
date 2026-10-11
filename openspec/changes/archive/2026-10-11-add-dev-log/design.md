## Context

`deduce-route-mid-sortie` added `src/fleet/sortie-log.ts`, an always-on `logSortie(event, data)` writing `<workDir>/logs/sortie.ndjson`. It is called from the special-attack recorder's `game.response` listener (start, port, battle) and from the runner (run, run-failed). Config lives under `plugin.poi_battle_sim.*`, read through `readConfig` each time it is used, so the settings page's changes apply at once (as `loadAutoRunDelay` does).

## Goals / Non-Goals

**Goals:**
- One logging entry point that is a no-op when off and never throws.

**Non-Goals:**
- Log levels, or a viewer in the panel. The file is read with a text editor or `grep`.
- Logging focus decisions. poi's `valid` gets no path, so a line would say little.

## Decisions

**`devLog(event, data)` in `src/devlog.ts`.** It reads the flag on every call, and returns at once when the flag is off. Otherwise it appends a line `{ time, event, …data }` to `<workDir>/logs/dev.ndjson`. Before writing, a file over 2 MB is renamed to `dev.1.ndjson`. Every error is swallowed. This replaces `sortie-log.ts`: the sortie events become dev-log events, so there is one file to read and one switch. Checking the size on every write costs a `stat` per event, which is small next to the work being logged.

**Events, named by where they happen:**
- `sortie.start`, `sortie.port` and `sortie.battle`, from the recorder;
- `run.start` (input, snapshot), `run.predicted` (candidates), `run.narrowed` (cells, letters, kept routes, record, specials passed), `route.config` (row, nodes, TOML), `route.done` (row, reach-boss and the S/A/B rates over all trials) or `route.failed`, and `run.finished`, `run.cancelled` or `run.failed` (error code, message, details), from the runner;
- `auto.scheduled` (trigger `change` or `focus`, delay), from the panel.

**The flag's reader in `inputs.ts`.** `DEV_LOG_KEY` and `loadDevLog()` sit with the other settings, and only `true` turns it on. The settings page gets a checkbox with the file's path under it.

## Risks / Trade-offs

- [The log holds fleet data] → it stays on the user's machine, in poi's app data, and only when they turn it on.
- [A busy session fills 2 MB quickly while on] → one older file is kept. A rare event worth checking should be copied out soon after.
