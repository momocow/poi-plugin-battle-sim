// Stand-in for poi's views/utils/game-utils in tests. Deliberately simple:
// tests check what the plugin feeds these helpers, not poi's formulas.
type Rec = Record<string, any>
type EquipData = [Rec, Rec, number | undefined] | undefined
type ShipData = [Rec, Rec] | undefined

export function getTyku(equipsData: (EquipData[] | undefined)[]) {
  let max = 0
  for (const ship of equipsData) for (const e of ship ?? []) if (e && (e[2] ?? 0) > 0) max += Math.floor((e[1].api_tyku ?? 0) * Math.sqrt(e[2] ?? 0))
  return { basic: max, min: max, max }
}

export function getSaku33(shipsData: ShipData[], equipsData: (EquipData[] | undefined)[], teitokuLv: number, mapModifier = 1) {
  let total = 0
  shipsData.forEach((s, i) => {
    if (!s) return
    total += Math.sqrt(s[0].api_sakuteki[0])
    for (const e of equipsData[i] ?? []) if (e) total += (e[1].api_saku ?? 0) * 0.6 * mapModifier
  })
  total -= Math.ceil(teitokuLv * 0.4)
  return { ship: 0, item: 0, teitoku: 0, total: Math.round(total * 100) / 100 }
}

export const getFleetSpeed = (shipsData: ShipData[]) => ({
  speed: Math.min(...shipsData.map((s) => (s ? s[0].api_soku : Infinity))),
})

export const getSpeedLabel = (speed: number): string => ({ 5: 'Slow', 10: 'Fast', 15: 'Fast+', 20: 'Fastest' })[speed] ?? 'Unknown'

// Copied from poi: small enough that a test can check the plugin passes it a percentage, not a ratio.
export function getMaterialStyle(percent: number): 'red' | 'orange' | 'yellow' | 'green' {
  if (percent <= 50) return 'red'
  if (percent <= 75) return 'orange'
  if (percent < 100) return 'yellow'
  return 'green'
}
