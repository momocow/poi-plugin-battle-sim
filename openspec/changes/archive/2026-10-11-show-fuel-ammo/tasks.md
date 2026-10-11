## 1. View model

- [x] 1.1 Declare `getMaterialStyle(percent: number)` in the `views/utils/game-utils` block and `MaterialIcon` in the `views/components/etc/icon` block of `src/poi-modules.d.ts`
- [x] 1.2 Add `SupplyView { now, max, intent, cost }` and optional `fuel` / `ammo` on `ShipView` in `src/fleet-view/model.ts`; export a `resupplyCost(now, max, level)` helper with poi's formula (≥1, ×0.85 above level 99, 0 when full)
- [x] 1.3 Fill `fuel` / `ammo` in `buildFleetViewModel` from the snapshot's `fuel`/`fuelMax` and `ammo`/`ammoMax`, leaving each out when its max is undefined
- [x] 1.4 Extend `test/model.test.ts`: colour thresholds (100/99/75/51/50/0%), cost at level 50 and 175 (`10/15 → 5`, `0/15 @175 → 12`, minimum 1), full → cost 0, missing max → field absent

## 2. Display

- [x] 2.1 Add `src/fleet-view/SupplyBars.tsx`: fuel over ammo `ProgressBar`s with right-placed tooltips showing the material icon, `now / max` and ` (-cost)` when below full; reword `SlotItem.tsx`'s "only module that imports poi's icon component" comment
- [x] 2.2 Render `SupplyBars` in `ShipRow` between the HP block and the slots; update the module comment in `FleetView.tsx`
- [x] 2.3 Update `.battle-sim-ships` in `src/ui/styles.ts` to four columns (info | HP | ~28px supply | slots, info/HP minimum ~80px) and add the supply-bar styles (thin bars, 4px apart, bottom-aligned)

## 3. Verification

- [x] 3.1 Run `npm test` and the type check
- [x] 3.2 In poi, check against the fleet tab: an under-supplied ship shows matching bar colours and tooltip text, a run's snapshot keeps the captured supply after resupplying, and a 6-ship fleet with full slots fits 400px wide without horizontal scrolling
