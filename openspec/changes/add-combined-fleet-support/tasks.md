## 1. Checks before building

- [ ] 1.1 In Chrome, load compass with a deck-builder document containing `f1` + `f2`, then record: whether `?pdz=`/`?predeck=` sets `selectedType` on its own, the `selectedType` code for each of Carrier Task Force, Surface Task Force, and Transport Escort, and that `UPDATE_SELECTED_TYPE` makes compass recompute `simResult`. Use one map that supports combined fleets (for example 6-4 or 7-2)
- [ ] 1.2 Run the optimizer on a combined config where only an escort ship can sink, and confirm that `player_sunk_any_rate` counts it

## 2. Fleet capture

- [ ] 2.1 Change the snapshot to a tagged union `single | combined`, and map `combinedFlag` 1/2/3 to `ctf`/`stf`/`tcf` in the snapshot module
- [ ] 2.2 Change the rejection rules: fleet 1 or 2 selected on its own while combined is refused with a message pointing to the combined option, and an empty main or escort fleet is refused
- [ ] 2.3 TOML converter: `[[fleet.main]]`, `[[fleet.escort]]`, and `combined_type` for combined snapshots
- [ ] 2.4 Deck-builder converter: `f1` main and `f2` escort
- [ ] 2.5 Tests with a captured combined poi state: the two outputs agree on ships, fleets, and type

## 3. Route prediction and simulation

- [ ] 3.1 Compass driver: set the fleet type with `UPDATE_SELECTED_TYPE` using the codes from 1.1, read it back, and fail with `COMPASS_SHAPE` on a mismatch
- [ ] 3.2 Add the combined type and the escort composition to the prediction cache key
- [ ] 3.3 Test by hand: a combined fleet on 6-4 in poi gives routes and a finished run

## 4. Panel

- [ ] 4.1 Fleet selector: add "Combined (1+2) · <type>" while combined, select it automatically when the fleets are combined, drop it and fall back to fleet 1 when split, and handle a stored selection on load; pass fleets `[1, 2]` to `fleetLoadout` for the automatic-run check when combined is selected
- [ ] 4.2 Fleet view: a header with the combined type, then main and escort groups each with its own summary row, collapsing together, in the single column
- [ ] 4.3 Add the combined choice and the two-fleet view to the demo page
