## MODIFIED Requirements

### Requirement: Fleet display
The panel SHALL show the fleet being simulated. Before a run, it SHALL show the selected fleet from live game state and update when that state changes, marked Live next to the fleet label. Once a run starts, it SHALL show the captured snapshot instead, and it SHALL keep showing that snapshot through the results, even if the game state changes.

The display SHALL have:
- **A summary row** with the following:
  - fleet speed;
  - fighter power;
  - line of sight (LoS) by Formula 33, at the multiplier that applies to the selected map: ×3 for 6-2 and 6-3, ×4 for 3-5 and 6-1, and ×1 otherwise. The multiplier is shown next to the value, and hovering over the value shows ×1, ×3 and ×4.
  - When any ship is below full HP, a warning with the number of damaged ships.
- **One row per ship**, laid out after poi's fleet tab: level and ship type above the ship name, then current and maximum HP with morale, then fuel and ammo, then the equipment.
  - HP SHALL be shown as `now / max` above a bar whose length is the HP ratio, colored by damage state as poi colors it:
    - no damage above 75% of maximum;
    - 小破 above 50% and at most 75%;
    - 中破 above 25% and at most 50%;
    - 大破 at most 25%.
  - Hovering over a damaged ship's HP SHALL name its damage state.
  - Morale SHALL be shown as its number with poi's colored square, in poi's bands (0–19, 20–29, 30–39, 40–48, 49, 50–52, 53 and above), so a sparkled ship shows a yellow square and an unchanged ship a white one.
  - Fuel and ammo SHALL be shown as two thin bars stacked fuel above ammo, as on poi's fleet tab, each as long as the current/maximum ratio and colored as poi colors supply:
    - green when full;
    - yellow below full and above 75%;
    - orange above 50% and at most 75%;
    - red at most 50%.
  - Hovering over a fuel or ammo bar SHALL show that resource's icon and `now / max`, followed, when below full, by the resupply cost as poi computes it: the missing amount, reduced by 15% and rounded down for a ship above level 99, and at least 1 — for example `10 / 15 (-5)`.
  - When a ship's maximum fuel or ammo is not known, that bar SHALL NOT be shown.
- **Per ship, its equipment in slot order, as icons.**
  - Hovering over an icon shows the item's name, the improvement level as ★N when above 0, and an aircraft proficiency marker when proficiency is between 1 and 7.
  - The expansion-slot item is shown after the main slots and visibly set apart.
  - Empty slots are not shown.

Names SHALL follow poi's language setting.

#### Scenario: Live fleet before running
- **WHEN** the user selects fleet 2 and then swaps a piece of equipment in game
- **THEN** the panel shows fleet 2 with the new equipment, and the summary values update

#### Scenario: Snapshot during and after a run
- **WHEN** a run has started and the user then changes fleet 2 in game
- **THEN** the panel keeps showing the snapshot taken when the run started, and the footer shows its capture time

#### Scenario: Improved and skilled equipment
- **WHEN** a ship carries a ★10 gun and a fighter with proficiency 7
- **THEN** both show as icons; hovering over the gun shows its name with ★10, and hovering over the fighter shows the proficiency-7 marker

#### Scenario: Damaged ship
- **WHEN** a ship has 20 of 45 HP and another has 44 of 45
- **THEN** the first shows 20 / 45 with an orange (中破) bar, the second shows 44 / 45 with a green bar, and the summary row warns of 2 damaged ships

#### Scenario: Morale
- **WHEN** a ship has morale 53 and another has morale 49
- **THEN** the first shows 53 with a yellow square, and the second shows 49 with a white square

#### Scenario: LoS for 6-1
- **WHEN** the selected map is 6-1
- **THEN** the summary row shows the ×4 LoS value labeled ×4

#### Scenario: Under-supplied ship
- **WHEN** a level-50 ship has 10 of 15 fuel and 20 of 20 ammo
- **THEN** its fuel bar is two thirds long and orange, and hovering over it shows the fuel icon with `10 / 15 (-5)`; its ammo bar is full and green, and hovering over it shows `20 / 20` with no cost

#### Scenario: Resupply cost for a married ship
- **WHEN** a level-175 ship has 0 of 15 fuel
- **THEN** its fuel bar is empty and red, and hovering over it shows `0 / 15 (-12)`

#### Scenario: Supply in the snapshot
- **WHEN** a run has started and the ship is then resupplied in game
- **THEN** the fuel and ammo bars keep showing the levels captured when the run started
