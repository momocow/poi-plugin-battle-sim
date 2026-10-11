## Context

The fleet display (`src/fleet-view/`) renders one `FleetViewModel`, built by `buildFleetViewModel` from a `FleetSnapshot` for both the live view and a run's frozen snapshot. The snapshot already carries `fuel`, `ammo`, `fuelMax` and `ammoMax` per ship (added for sending current supply to the optimizer), so no capture change is needed. `model.ts` is the only importer of poi's `views/utils/game-utils`; `SlotItem.tsx` is the only importer of poi's icon component. Ships sit in one CSS grid (`.battle-sim-ships`: info | HP | slots) so columns line up across rows.

poi's own fleet tab (`views/components/ship/ship-item.tsx`) renders fuel and ammo as a `ShipFB` column of two Blueprint `ProgressBar`s, intent from `getMaterialStyle(percent)`, each in a right-placed `Tooltip` showing `MaterialIcon` 1 (fuel) / 2 (ammo), `now / max`, and when below 100% ` (-cost)` with `cost = max(1, floor((max - now) × (lv > 99 ? 0.85 : 1)))`.

## Goals / Non-Goals

**Goals:**
- Match poi's fleet tab look and hover text, reusing poi's own colour helper and material icons so they track poi's theme and icon-set setting.
- Keep the panel within 400px wide.

**Non-Goals:**
- A fleet-level "needs resupply" warning in the summary row (poi doesn't have one either; can follow later).
- Plane counts per slot.

## Decisions

**Supply in the view model, not the component.** `ShipView` gains `fuel` and `ammo`, each `SupplyView = { now, max, intent, cost }` or undefined when the maximum is unknown. Ratio, intent and resupply cost are computed in `buildFleetViewModel`, so they are unit-testable in `test/model.test.ts` alongside `damageOf`/`moraleBand`, and the component only renders. `cost` is 0 when full (tooltip omits it).

**Colour from poi's `getMaterialStyle`.** Declared in `poi-modules.d.ts` next to the existing `game-utils` helpers and called from `model.ts`, keeping that module the single `game-utils` importer. Alternative — copying the thresholds like `damageOf` does — was rejected because poi exports exactly this function and HP was hand-written only for its integer-exact boundaries. Intent names (`green`/`yellow`/`orange`/`red`) are what poi's global CSS colours on a ProgressBar, same as `HP_INTENT` today.

**Resupply cost formula copied from poi.** poi computes it inline in the component, not as an exported helper, so the model reimplements `max(1, floor(missing × (level > 99 ? 0.85 : 1)))` with a comment pointing at poi.

**New `SupplyBars.tsx` component.** Renders the two stacked bars with tooltips (`placement="right"`, matching poi), importing poi's `MaterialIcon` (declared in `poi-modules.d.ts` beside `SlotitemIcon`). `SlotItem.tsx`'s header comment claiming to be the only icon importer is reworded. Alternative — inlining in `ShipRow` — would grow `FleetView.tsx` with tooltip markup; a sibling of `SlotItem` matches the existing split.

**Grid gains a narrow fixed column.** `.battle-sim-ships` becomes info | HP | supply | slots, the supply column fixed at about 28px with bars ~5px tall and 4px apart (as poi's `ShipFB`), aligned to the row bottom like the HP bar. To stay within 400px, the two `minmax(90px, 1fr)` columns drop to ~80px minimum; verified at 400px with a 6-ship fleet carrying 5 slots + expansion.

## Risks / Trade-offs

- [Extra column crowds a 400px panel] → narrow fixed column, reduced minimums, and an explicit 400px check in tasks; ship names already ellipsize.
- [`getMaterialStyle`/`MaterialIcon` signatures change in a future poi] → same exposure as existing `getTyku`/`SlotitemIcon` use; the typed declarations localise the breakage.
- [Missing master data] → bar omitted rather than drawn against a guessed max (poi uses 1, which would show a misleading full bar).
