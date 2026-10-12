## 1. During the next event

- [ ] 1.1 With the developer log on, open the event's maps in game and capture `api_get_member/mapinfo` and the master data's `api_sally_flag` for each map, including one that allows only combined fleets
- [ ] 1.2 Verify `api_sally_flag` bit meaning and `api_eventmap` fields against `routes/eventState.ts`; fix `allowsSingleFleet` / `eventStateFromGame` if they differ, and add the captured bodies as test fixtures
- [ ] 1.3 Manual check in poi: a single-fleet event map runs with From-game state and with an override; a variant the snapshot lacks is fetched once; a combined-only map shows the "not supported yet" error
