/**
 * The full `simulate` TOML for one route.
 *
 * `route` omits the start node, as the optimizer expects. The boss is the
 * route's last node, and the optimizer requires `do_night_battle` there; the
 * plugin always pursues night battle at the boss. `[output] fields = ["ranks"]`
 * selects the diag channel that carries every rate the panel shows.
 */
import { fleetShipsToml } from '../fleet/toToml'
import type { FleetSnapshot } from '../fleet/types'

const str = (s: string) => JSON.stringify(s)

export function simulateToml(input: {
  snapshot: FleetSnapshot
  map: string
  /** Nodes after the start node, ending at the boss. */
  nodes: string[]
  trials: number
}): string {
  const boss = input.nodes[input.nodes.length - 1]
  return [
    '[fleet]',
    '',
    fleetShipsToml(input.snapshot),
    '',
    '[route]',
    `map = ${str(input.map)}`,
    `route = [${input.nodes.map(str).join(', ')}]`,
    '',
    `[tactics.nodes.${boss}]`,
    'do_night_battle = true',
    '',
    '[run]',
    `trials = ${input.trials}`,
    '',
    '[output]',
    'fields = ["ranks"]',
    '',
  ].join('\n')
}
