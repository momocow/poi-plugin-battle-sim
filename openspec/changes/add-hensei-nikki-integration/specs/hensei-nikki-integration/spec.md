## Purpose

Lets the battle-sim panel simulate fleets saved in plugin-hensei-nikki, and save simulated fleets back to it, without the user re-forming fleets in game or retyping them.

## ADDED Requirements

### Requirement: Detect hensei-nikki
The integration SHALL be available only while hensei-nikki is loaded in poi, its records are readable, and every record it reads has the record format it supports (`version: "poi-h-v1"`). When hensei-nikki is not loaded, the integration SHALL be unavailable without any error. Records in other formats SHALL be listed as unsupported and SHALL NOT be readable or overwritten.

#### Scenario: hensei-nikki not installed
- **WHEN** hensei-nikki is not installed or is disabled
- **THEN** no hensei-nikki controls are offered and nothing is logged as an error

#### Scenario: Unsupported record
- **WHEN** a record has a format other than `poi-h-v1`
- **THEN** it is listed as unsupported and cannot be selected

### Requirement: Read a record's fleet into a snapshot
The user SHALL be able to choose a record by title and one non-empty fleet within it. The system SHALL build the same snapshot as for a live fleet: ship IDs and levels, and per slot the equipment ID, improvement level, and proficiency. Values the record does not store SHALL be filled in as follows:
- **Modernization**: from an owned ship with the same ship ID, preferring the same level and otherwise the highest level. If the player owns none, modernization is 0.
- **Current HP**: full.
- **Morale**: the default.
- **Expansion slot**: the record stores it as an owned-equipment reference. It is resolved through the player's current equipment. If that item no longer exists, the slot is left empty.

Every filled-in value SHALL be marked on the snapshot so it can be shown. Fleets with no ships SHALL NOT be offered.

#### Scenario: Owned ship provides modernization
- **WHEN** a record has ship 145 at level 99, and the player owns ship 145 at level 99 with luck modernization +60
- **THEN** the snapshot uses that ship's modernization, and marks modernization as taken from an owned ship

#### Scenario: Ship not owned
- **WHEN** the player owns no ship with that ship ID
- **THEN** the snapshot uses modernization 0 and marks it as unknown

#### Scenario: Expansion slot item gone
- **WHEN** the record's expansion-slot reference points to equipment the player no longer has
- **THEN** the expansion slot is empty and marked as missing

### Requirement: Save a simulated fleet as a new record
After a run finishes, the user SHALL be able to save the run's snapshot fleet to hensei-nikki as a new record in its supported format. The record stores the fleet as fleet 1. The title defaults to "<map> <date time>". The note SHALL hold a one-line summary: map, branch and phase choices, reach-boss rate, S rate (all trials), and date. The save SHALL go through hensei-nikki, so it shows up in hensei-nikki straight away and hensei-nikki writes it to its own file.

#### Scenario: Saved record appears in hensei-nikki
- **WHEN** the user saves a finished 5-2 run as "5-2 test"
- **THEN** hensei-nikki lists "5-2 test" with the fleet and a note such as "5-2 · reach 95.1% · S 72.0% · 2026-10-10"

#### Scenario: Round trip
- **WHEN** a saved record is read back as a battle-sim fleet source
- **THEN** it gives the same ship IDs, levels, equipment, improvement levels, and proficiency as the run's snapshot

### Requirement: Never overwrite silently
Saving SHALL NOT replace an existing record unless the user confirms in the panel that it should be replaced. Saving SHALL be refused when hensei-nikki has not finished loading its records.

#### Scenario: Title already used
- **WHEN** the user saves with a title that already exists
- **THEN** the panel asks whether to replace that record, and nothing is written until the user confirms
