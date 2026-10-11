# developer-log Specification

## Purpose

An opt-in log of the plugin's main steps, written as it works, so that rare behavior seen in the game can be checked afterwards.

## Requirements

### Requirement: Opt-in developer log
The plugin SHALL have a poi config setting that turns a developer log on or off. It SHALL be off by default. The plugin's settings page SHALL have a switch for it that shows where the log file is. A change SHALL apply from the next event, without restarting poi. While the setting is off, the plugin SHALL NOT write the log.

#### Scenario: Default
- **WHEN** the setting has never been changed
- **THEN** no developer log file is written

#### Scenario: Turned on
- **WHEN** the user turns the switch on and then changes the map
- **THEN** the log gets lines for the automatic run that follows, without restarting poi

### Requirement: Log contents
While the log is on, the plugin SHALL append one JSON object per line to a file in its folder under poi's app data. Each line SHALL carry the time and an event name. The log SHALL cover:
- the start of a sortie and the return to port, with the record of special attacks after them;
- each battle response of a sortie, with each shelling phase's attack fields as the game sent them (attacker side, attacker, attack type or night special type), the special attacks recorded from them, and any friendly special that the optimizer does not accept;
- each run's start, with its input and the fleet snapshot;
- the routes predicted, and, mid-sortie, the cells visited, their node letters, the routes kept and the special attacks passed;
- each simulated route's optimizer config and a summary of its result or its error;
- how the run ended: finished, cancelled or failed with its error;
- each automatic run scheduled, with its trigger and delay.

The file SHALL be kept under about 2 MB: when it is larger, it SHALL move to a single older file, replacing the one before. A failure to write the log SHALL NOT affect the plugin.

#### Scenario: Special attack in a sortie
- **WHEN** the log is on and the fleet's Nelson fires a Nelson Touch at C, and the fleet advances to E
- **THEN** the log has a battle line for C whose raw day shelling fields show attack type 100 by a friendly attacker and whose recorded specials include 100, and a run line for E that passes 100

#### Scenario: Log rotation
- **WHEN** the log file is over 2 MB and another event is written
- **THEN** the file moves to the older file and the event starts a new file

#### Scenario: Log off
- **WHEN** the setting is off and a sortie with battles takes place
- **THEN** no log file is written
