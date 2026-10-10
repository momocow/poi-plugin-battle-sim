`store.json` is a real poi store captured with `node scripts/capture-store.mjs`
from a logged-in session (member id dropped). It holds the four fleets, their
ships and equipment, the master data they reference, `$maps` / `$mapareas`,
and `sortie.combinedFlag`. It already has an equipped expansion slot (fleet 1,
鳳翔改二), an opened-but-empty one (`api_slot_ex: -1`) and unopened ones (`0`).
The session had no ship with an empty middle slot and no combined fleet; tests
derive those two cases from this state rather than from a second capture.
