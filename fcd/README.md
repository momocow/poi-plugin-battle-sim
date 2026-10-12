`poi-plugin-battle-sim-data`: the frequently changed data (fcd) the plugin reads
at runtime. It is published to npm on its own schedule, separate from the plugin.
The plugin depends on one version, which is installed with it. While poi runs,
it checks the registry for a newer version with the same major, and installs one
into poi's app data when the user approves the update. Data that changes faster
than the plugin is released belongs here, not in the plugin's code.

## Parts

`manifest.json` lists the parts, each with its own format version and path:

```json
{ "parts": { "<name>": { "format": 1, "path": "<file or directory>" } } }
```

A plugin reads only the parts and formats it supports, and ignores the rest. A
version that lacks a part the plugin needs, or has it in a format the plugin
doesn't support, is not used by that plugin.

| Part | Format 1 |
|---|---|
| `optimizer` | The optimizer's data directory (`maps.json`, `ships.json`, `enemies.json`, `bonuses/<map>.json`, …), as `kancolle-fleet-optimizer` reads it with `--data-dir`. Filled by `npm run fetch-optimizer` from the archive pinned in `../optimizer.json`; not committed. |
| `mapChoices` | `{ "maps": { "<map>": { "branches": [{ "node", "targets": [...], "default" }], "phases"?: [{ "value", "label" }] } } }`: the player-selected branches and phases compass models. A map without choices is left out. `default` must be one of `targets`. |
| `nodeDistances` | `{ "maps": { "<map>": { "<letter>": <distance> } } }`: each node's distance from the land bases, a whole number of at least 1. Only nodes a land base can target are listed; a node left out is unknown. |
| `eventGauges` | `{ "maps": { "<map>": { "<difficulty 1–4>": { "<gauge>": <hp> } } } }`: the gauge HP at or below which a gauge is in its last dance, a whole number of at least 1. The gauge numbers listed are the map's gauges. |
| `kcnav` | The optimizer's kcnav cache layout: `<map>/_map.json`, `<map>/<letter>.json` for normal maps, and `<map>/<variant>/<letter>.json` for event maps, with `variant = d{difficulty}-g{gauge}-c{cleared}-L{min}_{max}` (`x` for unset). |

## Sources

- `nodeDistances` for 6-4, 6-5 and 7-4: the 半径 column of the enemy composition tables on wikiwiki.jp 艦これ攻略Wiki (中部海域, 南西海域; 2026-09), checked against the node letters of the kcnav topology. These are the wiki's figures, not values read from the game's `api_req_map/start` (`api_cell_data[].api_distance`), and should be replaced by captured values when available. The 6-4 rule that a jet (橘花改, 噴式景雲改) reaches the boss at radius 2 is about equipment, not a node distance, and is not in the table.

## Versions

- Adding a part, or adding data to a part in its format, is a **minor** version.
- A format change ships as a new part next to the old one (for example
  `optimizer2`) for as long as older plugins read the old one. That keeps it minor.
- Removing a part, or changing a format in place, is a **major** version. A
  plugin only takes versions with the major it depends on.
