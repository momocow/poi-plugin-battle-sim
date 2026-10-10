## 1. Checks before building

- [ ] 1.1 In poi with hensei-nikki v5.0.5: dump `state.ext['poi-plugin-hensei-nikki']`, confirm the path to `henseiData.data` and the init flag, save a fleet that has an expansion slot, restart poi, and check whether `slots.ex` survives in the reloaded record and in `<APPDATA>/hensei-nikki/<member id>.json`
- [ ] 1.2 Dispatch `@@HENSEI_SAVE_DATA` from a scratch plugin and confirm that hensei-nikki shows the record straight away and writes it to its file

## 2. Adapter

- [ ] 2.1 `hensei/adapter.ts`: availability check (extension present and initialized), listing records with supported and unsupported status, and record fleet → snapshot
- [ ] 2.2 Filling in values: modernization from an owned ship (same level first, else highest, else 0), full HP, default morale, expansion slot resolved through owned equipment, all with `provenance` flags
- [ ] 2.3 Snapshot → `poi-h-v1` record, with the default title "<map> <date time>" and a one-line result note
- [ ] 2.4 Save via `@@HENSEI_SAVE_DATA`, refused when unavailable. Callers check for an existing title first
- [ ] 2.5 Tests with a captured hensei-nikki state: reading a record, unsupported versions, each fill-in rule, a missing expansion slot, and the round trip snapshot → record → snapshot (ships, levels, equipment, improvement, proficiency)

## 3. Panel

- [ ] 3.1 Fleet source switch "In game / Hensei-nikki", shown only when available: searchable record list, a fleet picker for records with more than one fleet, remembered between sessions, and a fallback when the record is gone
- [ ] 3.2 Fleet view: a "Hensei: <title>" tag, markers for modernization taken from an owned ship or unknown, and for a missing expansion slot, plus a note that HP is full and morale is the default
- [ ] 3.3 "Save to hensei-nikki" in the summary after a run: an editable title, an in-panel replace confirmation for an existing title, and a success message
- [ ] 3.4 Add the source switch and the save action to the demo page
- [ ] 3.5 Manual check in poi: simulate a record, save the result, see it in hensei-nikki, restart poi, and simulate the saved record again
