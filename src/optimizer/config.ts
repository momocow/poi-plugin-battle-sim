/**
 * The full `simulate` TOML for one route.
 *
 * `route` omits the start node, as the optimizer expects. Its last node is the
 * target: the boss, or a node a route was cut at. Each node in `formations` or
 * `nightBattles` gets its player formation and `do_night_battle` in its own
 * `[tactics.nodes.<letter>]` table; the optimizer requires `do_night_battle`
 * at a boss, and nodes without a battle must not be in either, as it rejects
 * tactics there. `[output]` selects `ranks`, the diag channel that carries
 * every boss rate the panel shows, and `ranks-per-node`, free to collect, for
 * the route cards' per-node tooltips; a node target adds `node-outcomes` for
 * the flagship-sunk rate at that node.
 * `special_attacks_fired` lists the once-per-sortie specials already fired,
 * so the optimizer won't fire them again in the rest of a sortie.
 */
import { fleetShipsToml } from '../fleet/toToml'
import type { FleetSnapshot } from '../fleet/types'
import type { Formation } from '../routes/formation'

const str = (s: string) => JSON.stringify(s)

export function simulateToml(input: {
  snapshot: FleetSnapshot
  map: string
  /** Nodes after the start node, ending at the target. */
  nodes: string[]
  trials: number
  /** Whether to pursue night battle at each node that gets `do_night_battle`, by letter. */
  nightBattles: Record<string, boolean>
  /** Ask for `node-outcomes` too, for a node target. */
  perNode: boolean
  /** Special-attack ids fired earlier in the sortie, one per firing. */
  specialAttacksFired?: number[]
  /** The player formation at each battle node of `nodes`, by letter. */
  formations: Record<string, Formation>
}): string {
  const { formations, nightBattles } = input
  // One table per node, in route order (a node a route passes twice takes one).
  const tactics = [...new Set(input.nodes.filter((n) => n in formations || n in nightBattles))].flatMap((node) => [
    `[tactics.nodes.${node}]`,
    ...(node in formations ? [`formation = ${str(formations[node]!)}`] : []),
    ...(node in nightBattles ? [`do_night_battle = ${nightBattles[node]}`] : []),
    '',
  ])
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
    ...tactics,
    '[run]',
    `trials = ${input.trials}`,
    '',
    '[output]',
    input.perNode ? 'fields = ["ranks", "ranks-per-node", "node-outcomes"]' : 'fields = ["ranks", "ranks-per-node"]',
    '',
  ].join('\n')
}
