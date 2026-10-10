// Capture the slices of poi's store this plugin reads into test/fixtures/store.json.
//
// Reads a running poi through poi-plugin-nanodesu-mcp (http://localhost:12450/mcp),
// keeps only the four fleets, their ships and equipment, the master data they
// reference, the map master data and the combined-fleet flag, and drops the
// member id. Usage: node scripts/capture-store.mjs [port]
import { writeFileSync } from 'node:fs'

const port = process.argv[2] ?? '12450'

async function get(path) {
  const res = await fetch(`http://localhost:${port}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'poi_get', arguments: { path, limit: 1000, maxBytes: 262144 } },
    }),
  })
  const body = await res.json()
  const parsed = JSON.parse(body.result.content[0].text)
  if (parsed.truncated) throw new Error(`${path} was truncated`)
  return parsed.value ?? parsed.items
}

const fleets = (await get('info.fleets')).map(({ api_member_id, ...fleet }) => fleet)
// The server caps a response at 256 KiB, so records are fetched one by one.
const byId = async (root, ids) =>
  Object.fromEntries(await Promise.all([...new Set(ids)].map(async (id) => [String(id), await get(`${root}.${id}`)])))

const shipIds = fleets.flatMap((f) => f.api_ship).filter((id) => id > 0)
const ships = await byId('info.ships', shipIds)
const equipIds = Object.values(ships).flatMap((s) => [...s.api_slot, s.api_slot_ex]).filter((id) => id > 0)
const equips = await byId('info.equips', equipIds)

const store = {
  info: {
    basic: { api_level: (await get('info.basic')).api_level },
    fleets,
    ships,
    equips,
  },
  const: {
    $ships: await byId('const.$ships', Object.values(ships).map((s) => s.api_ship_id)),
    $equips: await byId('const.$equips', Object.values(equips).map((e) => e.api_slotitem_id)),
    $shipTypes: await get('const.$shipTypes'),
    $maps: await get('const.$maps'),
    $mapareas: await get('const.$mapareas'),
  },
  sortie: { combinedFlag: (await get('sortie')).combinedFlag },
}

writeFileSync(new URL('../test/fixtures/store.json', import.meta.url), JSON.stringify(store, null, 1) + '\n')
console.log(`fleets ${fleets.length}, ships ${shipIds.length}, equips ${equipIds.length}`)
