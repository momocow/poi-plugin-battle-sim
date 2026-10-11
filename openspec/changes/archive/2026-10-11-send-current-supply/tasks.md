## 1. Optimizer

- [x] 1.1 Once the optimizer release with `fuel_now`/`ammo_now`/`slots_now` is published, bump `optimizer.json` (version, data archive, per-platform SHA256s) and check that `simulate` accepts a config using all three

## 2. Capture and TOML

- [x] 2.1 Add `api_fuel` and `api_bull` to `ApiShip`; `api_fuel_max`, `api_bull_max` and `api_maxeq` to `MstShip`; and `fuel`, `fuelMax`, `ammo`, `ammoMax`, `planes`, `planesMax` to `ShipSnapshot` in `src/fleet/types.ts`
- [x] 2.2 In `snapshotFleet`, capture them. `planes` and `planesMax` are cut to `api_slotnum`
- [x] 2.3 In `fleetShipsToml`, write `fuel_now`, `ammo_now` and `slots_now` (capped at their max) only when below full. Leave out a key whose max is unknown
- [x] 2.4 Add fuel, ammo and planes to the `fleetLoadout` key, not to `setup`
- [x] 2.5 Tests: the snapshot of an unresupplied ship, the TOML for full and partial supply and for capping, the key changing on a resupply while `setup` doesn't, and the store fixture extended if needed

## 3. Verify

- [x] 3.1 Run the type check and the test suite
- [x] 3.2 In poi: a sortie return without resupply starts a run with the low supply in its TOML (`route-*.log`). Resupplying starts another run, with no `fuel_now` etc., and doesn't bring the tab forward
