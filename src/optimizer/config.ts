/**
 * The full `simulate` TOML for one route.
 *
 * `route` omits the start node, as the optimizer expects. Its last node is the
 * target: the boss, or a node a route was cut at. `do_night_battle` there
 * follows the panel's Night battle switch; the optimizer requires it at a boss
 * and takes it at any battle node. `[output] fields = ["ranks"]` selects the
 * diag channel that carries every boss rate the panel shows; a node target
 * adds `ranks-per-node` and `node-outcomes` for the rates at that node.
 * `special_attacks_fired` lists the once-per-sortie specials already fired,
 * so the optimizer won't fire them again in the rest of a sortie.
 */
import { fleetShipsToml } from '../fleet/toToml'
import type { FleetSnapshot } from '../fleet/types'

const str = (s: string) => JSON.stringify(s)

export function simulateToml(input: {
  snapshot: FleetSnapshot
  map: string
  /** Nodes after the start node, ending at the target. */
  nodes: string[]
  trials: number
  /** Pursue night battle at the last node. */
  nightBattle: boolean
  /** Ask for the per-node channels, for a node target. */
  perNode: boolean
  /** Special-attack ids fired earlier in the sortie, one per firing. */
  specialAttacksFired?: number[]
}): string {
  const target = input.nodes[input.nodes.length - 1]
  return [
    '[fleet]',
    ...(input.specialAttacksFired?.length ? [`special_attacks_fired = [${input.specialAttacksFired.join(', ')}]`] : []),
    '',
    fleetShipsToml(input.snapshot),
    '',
    '[route]',
    `map = ${str(input.map)}`,
    `route = [${input.nodes.map(str).join(', ')}]`,
    '',
    `[tactics.nodes.${target}]`,
    `do_night_battle = ${input.nightBattle}`,
    '',
    '[run]',
    `trials = ${input.trials}`,
    '',
    '[output]',
    input.perNode ? 'fields = ["ranks", "ranks-per-node", "node-outcomes"]' : 'fields = ["ranks"]',
    '',
  ].join('\n')
}
