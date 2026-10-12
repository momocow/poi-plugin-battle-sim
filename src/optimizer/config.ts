/**
 * The full `simulate` TOML for one route.
 *
 * `route` omits the start node, as the optimizer expects. Its last node is the
 * target: the boss, or a node a route was cut at. `do_night_battle` there
 * follows the panel's Night battle switch; the optimizer requires it at a boss
 * and takes it at any battle node. Each battle node in `formations` gets its
 * player formation in its own `[tactics.nodes.<letter>]` table, the target's
 * included; nodes without a battle must not be in it, as the optimizer rejects
 * tactics there. `[output] fields = ["ranks"]` selects the
 * diag channel that carries every boss rate the panel shows; a node target
 * adds `ranks-per-node` and `node-outcomes` for the rates at that node.
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
  /** Pursue night battle at the last node. */
  nightBattle: boolean
  /** Ask for the per-node channels, for a node target. */
  perNode: boolean
  /** Special-attack ids fired earlier in the sortie, one per firing. */
  specialAttacksFired?: number[]
  /** The player formation at each battle node of `nodes`, by letter. */
  formations: Record<string, Formation>
}): string {
  const target = input.nodes[input.nodes.length - 1]!
  const { formations } = input
  // One table per node, in route order (a node a route passes twice takes one); the target always has one, for do_night_battle.
  const tactics = [...new Set([...input.nodes.filter((n) => n in formations), target])].flatMap((node) => [
    `[tactics.nodes.${node}]`,
    ...(node in formations ? [`formation = ${str(formations[node]!)}`] : []),
    ...(node === target ? [`do_night_battle = ${input.nightBattle}`] : []),
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
    input.perNode ? 'fields = ["ranks", "ranks-per-node", "node-outcomes"]' : 'fields = ["ranks"]',
    '',
  ].join('\n')
}
