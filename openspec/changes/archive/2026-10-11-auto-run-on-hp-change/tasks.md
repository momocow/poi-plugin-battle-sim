## 1. HP in the loadout key

- [x] 1.1 In `src/fleet/snapshot.ts`, add each ship's `api_nowhp` to its part of the `fleetLoadout` key, and update the doc comment (HP in; level, morale and proficiency out). Remove `Loadout.hp` and `hpRose`
- [x] 1.2 In `test/fleet.test.ts`, make the key test check that the key changes with HP and not with morale, and drop the `hp` and `hpRose` tests

## 2. Panel

- [x] 2.1 In `Panel.tsx`, remove the repair effect and the `hpRose` import, and update the header comment to name an HP change in the fleet as an automatic-run trigger

## 3. Verify

- [x] 3.1 Run the type check and the test suite
- [ ] 3.2 In poi: an instant repair on a ship in the selected fleet → one run after the delay. A damaged sortie return → one run. A node advance mid-sortie → the run restarts with the new HP. A morale-only change, an HP change in another fleet, or any change with Auto off → no run
