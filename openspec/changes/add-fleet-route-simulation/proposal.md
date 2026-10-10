## Why

The fleet optimizer at `../kancolle-fleet-optimizer` can run Monte Carlo battle simulations. To use it today you write TOML by hand and give it the route. Players already have their fleets loaded in poi. They want to ask "what are my odds on this map with the fleet I have right now?" without typing ships, equipment, or node letters.

## What Changes

- New poi plugin, `poi-plugin-battle-sim`, with one panel. In the panel the user picks one of their fleets and a normal map, clicks **Simulate**, and sees the results.
- The panel shows the fleet being simulated in the same layout as `plugin-hensei-nikki`. A summary row has speed, fighter power, and line of sight (Formula 33). Below it, each ship is listed with its level, ship type, and equipment (icon, name, ★ improvement level, aircraft proficiency, and the expansion slot). Before a run the panel shows the live fleet; from the moment a run starts it shows the captured snapshot.
- The fleet is taken from poi's live state at the moment the user clicks Simulate. Nothing is typed by hand.
- The route is predicted automatically by the compass route simulator (x-20a.github.io/compass), which runs in an isolated, hidden webview. Every possible route comes back with its probability. On maps where the player picks a branch or a phase (such as 4-5, 7-5, 5-6, and 7-3), the panel shows a control for each choice. The routes are predicted for those choices. If compass fails, the panel shows an error. There is no kcnav fallback, so the plugin adds no load to the kcnav servers, and manual route entry is not part of this change.
- Each predicted route is simulated by the optimizer's `simulate` command, run as a separate process. Simulation starts as soon as routes are predicted. The panel shows a table of routes (e.g. `A-B-C2-D[Boss]`) with each one's probability and its own results, and above it an overall summary such as the chance of reaching the boss and the S-rank rate.
- The optimizer binary is resolved at a pinned version and its checksum is verified. It is never committed to this repo. A development override, set on the plugin's settings page (or by environment variables), points at a local build.
- This plugin depends on optimizer CLI work that is agreed but not yet built: `--config -` (TOML on stdin), `--json` output for `simulate`, `--kcnav-dir`, and color output only on a terminal. That work is steps (a) and (c) of the optimizer plan and is done in the optimizer repo.

Not in this change: combined fleets, event maps (difficulty, phases, gimmicks), the `optimize` command, early stop, support fleets, land-based air, friend fleets, a manual route picker (planned as a later change), any route-prediction fallback, and clicking nodes on a map diagram.

## Capabilities

### New Capabilities
- `fleet-capture`: Reading a chosen fleet from poi's state and converting it into the optimizer's fleet input and the deck-builder format that compass reads.
- `route-prediction`: Producing the possible routes and their probabilities for a fleet and map with compass alone, reporting each kind of failure as an error, and marking which routes reach the boss using the bundled map data.
- `battle-simulation`: Running the optimizer for each route, reading its JSON output, and combining the results by route probability.
- `simulator-panel`: The plugin UI: choosing a fleet and map, displaying the fleet (live, then the snapshot), a table of the predicted routes with each route's results and an overall summary, showing progress and cancelling, showing results and errors.

### Modified Capabilities
<!-- none: no existing specs -->

## Impact

- **New project**: an npm package that poi loads as a plugin. It uses poi's React/Redux environment, the `<webview>` element, Node `child_process`, and poi's own fleet calculation helpers and equipment icon component.
- **External services**: x-20a.github.io/compass is the plugin's only network dependency. It is read through its page state, which is fragile, with results cached and no automatic retries. We plan to contact the compass author before releasing publicly. The plugin itself never calls kcnav. The optimizer fetches a map's kcnav topology once, the first time that map is simulated, and caches it in the user's app data folder.
- **Depends on the optimizer repo**: the CLI changes listed above, plus release builds for each platform from its CI, for packaging.
- **Disk**: the kcnav cache and temporary files go under poi's app data directory, never inside the plugin's install directory.
