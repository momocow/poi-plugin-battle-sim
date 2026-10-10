## ADDED Requirements

### Requirement: Hensei-nikki fleet source
While hensei-nikki is available, the panel SHALL let the user switch the fleet source between "In game" (fleets 1–4) and "Hensei-nikki". With "Hensei-nikki", the panel SHALL show a searchable list of record titles and, for records with more than one non-empty fleet, a fleet picker. The fleet display SHALL show the record's fleet, with a "Hensei: <title>" tag instead of "Live". The source and the record chosen SHALL be remembered between poi sessions. If the record no longer exists, the panel SHALL fall back to "In game" fleet 1.

#### Scenario: Pick a record
- **WHEN** the user switches to Hensei-nikki and picks "7-5 night battle", fleet 1
- **THEN** the fleet display shows that fleet tagged "Hensei: 7-5 night battle", and Simulate uses it

#### Scenario: Record deleted
- **WHEN** the remembered record has been deleted in hensei-nikki
- **THEN** the panel falls back to "In game" fleet 1

### Requirement: Filled-in values are visible
For a fleet read from hensei-nikki, the fleet display SHALL mark each ship whose modernization was taken from an owned ship or is unknown, and each missing expansion slot. A short note SHALL explain that HP is full and morale is the default for record fleets.

#### Scenario: Unknown modernization
- **WHEN** a record ship's modernization is unknown
- **THEN** that ship shows a "modernization unknown" marker

### Requirement: Save to hensei-nikki action
After a run finishes and hensei-nikki is available, the summary SHALL offer "Save to hensei-nikki", with an editable title and the default title and note filled in. When the title already exists, the action SHALL turn into an explicit "Replace existing record" confirmation in the panel. A successful save SHALL show a confirmation naming the record.

#### Scenario: Replace confirmation
- **WHEN** the user enters an existing title and presses Save
- **THEN** the panel shows "A record named '<title>' exists. Replace it?" with Replace and Cancel, and nothing is written until Replace is pressed
