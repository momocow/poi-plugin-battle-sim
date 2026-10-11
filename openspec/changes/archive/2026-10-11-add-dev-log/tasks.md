## 1. Developer log

- [x] 1.1 Add `DEV_LOG_KEY` (`plugin.poi_battle_sim.devLog`) and `loadDevLog()` (only `true` is on) to `src/ui/inputs.ts`
- [x] 1.2 Replace `src/fleet/sortie-log.ts` with `src/devlog.ts`: `devLog(event, data)`, a no-op when off, appending to `<workDir>/logs/dev.ndjson`, rotating to `dev.1.ndjson` above 2 MB, and never throwing
- [x] 1.3 Use it for the sortie events (`sortie.start`, `sortie.port`, `sortie.battle`) in `src/fleet/specials.ts`
- [x] 1.4 Log the run in `src/ui/runner.ts`: `run.start`, `run.predicted`, `run.narrowed`, `route.config`, `route.done` or `route.failed`, and `run.finished`, `run.cancelled` or `run.failed`
- [x] 1.5 Log `auto.scheduled` with its trigger and delay in `src/ui/Panel.tsx`
- [x] 1.6 Add the switch with the file path to `src/ui/Settings.tsx`, and its strings to the three i18n files
- [x] 1.7 Unit-test: off writes nothing, on appends lines, rotation above 2 MB, and the flag reader
- [x] 1.8 Point `deduce-route-mid-sortie`'s design and tasks at `dev.ndjson` and the switch

## 2. Verify

- [x] 2.1 Run the type check and the test suite
- [x] 2.2 In poi, with the switch on, change the map and check `dev.ndjson` for `auto.scheduled` and a whole run. Turn it off and check nothing more is written
