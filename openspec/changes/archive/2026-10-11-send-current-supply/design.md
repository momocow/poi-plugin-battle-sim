## Context

The optimizer, in a release after 0.2.1, takes per ship in `[[fleet.ships]]`:
- `fuel_now` and `ammo_now`: absolute values, 0 up to the ship's max;
- `slots_now`: one entry per body slot, without the expansion slot.

Leaving a key out means full. A value above its max, or a `slots_now` of the wrong length, fails the config load. Slots with only recon seaplanes ignore `slots_now`.

poi's store has `api_fuel`, `api_bull` and `api_onslot` (padded to 5) per ship, and `api_fuel_max`, `api_bull_max` and `api_maxeq` in the ship master data. poi updates them on resupply (`hokyu/charge`), on port, and on `ship_deck` mid-sortie.

`toToml` already writes `hp_now` only for a damaged ship. The `fleetLoadout` key drives automatic runs, and `setup` drives focus.

## Goals / Non-Goals

**Goals:**
- The optimizer sees exactly the supply and planes poi shows, and never a value it rejects.

**Non-Goals:**
- Showing the resupply bill. The optimizer's reported costs now include what was spent before the run, but the plugin doesn't show costs.
- The once-per-sortie special attack. That has been asked of the optimizer separately.

## Decisions

**Capture with the maximums, write only when below.** The snapshot keeps each current value with its max (`fuelMax`/`ammoMax` from master data, `planesMax` from `api_maxeq`), and `toToml` writes a key only when some value is below its max. This follows `hp_now`, keeps a fully supplied fleet's TOML unchanged, and keeps the plugin working against that fleet if a key is ever dropped.

**Clamp to what the optimizer accepts.** `planes` is `api_onslot` cut to `api_slotnum`. Values are capped at their max before writing, since a stale master entry must not fail the whole run. A missing master max means the key is not written.

**Supply in the run key, not in focus.** Fuel, ammo and planes join HP in the `fleetLoadout` key, so a resupply starts a run through the existing input-change effect, with the same delay and cancel-and-restart. `setup` stays ships and equipment only, so resupplying doesn't bring the tab forward.

**Optimizer version.** `optimizer.json` is bumped to the release with the keys, with new SHA256s, in the same change. Against 0.2.1, an unknown key might be rejected and fail every run, so the code must not ship before the bump.

## Risks / Trade-offs

- [The optimizer release isn't out yet] → this change is blocked until it is. Task 1 checks the release.
- [`deduce-route-mid-sortie` also modifies the Automatic runs requirement] → whichever change is archived second must merge the other's bullet into its MODIFIED block before syncing, or the sync would drop it.
- [A run after each node and on each resupply] → more background runs. Accepted, the same as for HP.
