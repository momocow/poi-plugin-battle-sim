`store.json` is a real poi store captured with `node scripts/capture-store.mjs`
from a logged-in session (member id dropped). It holds the four fleets, their
ships and equipment, the master data they reference, `$maps` / `$mapareas`,
and `sortie.combinedFlag`. It already has an equipped expansion slot (fleet 1,
鳳翔改二), an opened-but-empty one (`api_slot_ex: -1`) and unopened ones (`0`).
The session had no ship with an empty middle slot and no combined fleet; tests
derive those two cases from this state rather than from a second capture.

`kcnav/2-5/_map.json` is the `route` table (cell → [from, to, …]) of the
topology kancolle-fleet-optimizer v0.3.0 fetched for 2-5, used to turn a
sortie's visited cells into node letters.

`kcnav/5-2/_map.json` and `kcnav/1-5/_map.json` are the same kind of route
table for 5-2 and 1-5. `kcnav/5-2/{C,D,E}.json` and `kcnav/1-5/A.json` are
node enemy caches as the optimizer wrote them (v0.3.0, 90 days to 2026-10-11):
an air raid (C), a node where one composition has submarines (D), a normal
battle (E) and a submarine-only node (A), for the default formation rules.
