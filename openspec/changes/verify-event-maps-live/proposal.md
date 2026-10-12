## Why

`add-event-map-support` was built and tested between events, so the two parts that read live event data were never checked against the game: the meaning of `api_sally_flag`, and an event-map run end to end. Both fail safe today (an unreadable flag lets the run go ahead), but they rest on assumptions. This change checks them during the next event.

## What Changes

- Check, with the developer log, that bit 1 of `$maps[<id>].api_sally_flag[0]` means a single fleet may sortie, and that `info.maps[<id>].api_eventmap` has `api_selected_rank`, `api_gauge_num` and `api_now_maphp` as `routes/eventState.ts` reads them. Fix the reading if not.
- Run a single-fleet event map in poi, using the game's state and an override, including a variant the package's snapshot doesn't have.
- Add the captured responses as test fixtures.

No requirement changes: the specs in `add-event-map-support` already describe the behavior. If the check shows the specs are wrong, revise them here before fixing the code.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none: verification only (skip_specs) -->

## Impact

- `src/routes/eventState.ts` (`allowsSingleFleet`, `eventStateFromGame`) if the fields differ from what's assumed.
- New fixtures under `test/fixtures/`.
- Needs a running event; nothing can be done before one starts.
