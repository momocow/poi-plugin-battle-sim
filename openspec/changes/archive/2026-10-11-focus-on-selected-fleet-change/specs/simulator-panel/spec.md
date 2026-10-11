## MODIFIED Requirements

### Requirement: Auto focus
poi SHALL switch to the plugin's tab when a ship or its equipment is changed in game, and the change leaves the ships or equipment of the selected fleet different from what the panel last showed. The changes that count are: a ship placed in, removed from, or moved within or into or out of the selected fleet; a fleet preset loaded into it; a ship in it remodeled or modernized; equipment on a ship in it equipped, removed, improved, or moved between slots or ships; or an expansion slot opened on a ship in it. When the fleets are combined and the combined fleet is selected, the selected fleet is both fleets. Entering the remodel screen, and changes that leave the selected fleet's ships and equipment as they were, such as a change to another fleet only, SHALL NOT switch the tab. Changes to HP, morale or level SHALL NOT switch the tab, including repairs, so that poi's own switch to its main view on the docking screen and on returning to port stands.

Whether the selected fleet qualifies for an automatic run, and the Auto switch, SHALL NOT affect switching the tab.

The plugin SHALL declare these requests to poi's plugin auto switch rather than switch tabs itself, so the on/off checkbox is poi's "Enable auto switch" setting for this plugin, on by default and remembered by poi. poi's global auto-switch setting also applies.

#### Scenario: Equipment swapped
- **WHEN** auto switch is on, fleet 1 is selected, poi shows another tab, and the user swaps a gun on a ship in fleet 1
- **THEN** poi switches to the plugin's tab

#### Scenario: Equipment swapped in another fleet
- **WHEN** auto switch is on, fleet 1 is selected, poi shows another tab, and the user swaps a gun on a ship in fleet 2
- **THEN** poi stays on its current tab

#### Scenario: Ship moved into the selected fleet
- **WHEN** fleet 1 is selected and the user moves a ship from fleet 2 into fleet 1
- **THEN** poi switches to the plugin's tab

#### Scenario: Instant repair
- **WHEN** auto switch is on, fleet 1 is selected, and the user uses an instant repair on a ship in fleet 1
- **THEN** the plugin does not switch the tab, so poi shows its main view as it does for the docking screen, and an automatic run starts in the background

#### Scenario: Return from a sortie
- **WHEN** the selected fleet returns to port damaged, with no ship or equipment changed
- **THEN** poi does not switch to the plugin's tab

#### Scenario: Remodel screen entered
- **WHEN** auto switch is on and the user enters the remodel screen without changing anything
- **THEN** poi stays on its current tab

#### Scenario: Incomplete fleet
- **WHEN** the user unequips a gun from a ship in the selected fleet, leaving a main slot empty
- **THEN** poi switches to the plugin's tab, and no run starts

#### Scenario: Auto switch off
- **WHEN** the user unchecks "Enable auto switch" for this plugin and swaps a gun on a ship in the selected fleet
- **THEN** poi stays on its current tab
