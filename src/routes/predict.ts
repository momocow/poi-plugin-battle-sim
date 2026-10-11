/**
 * Route prediction for a fleet on a map: compass only, cached for the poi
 * session, with each candidate marked as ending at the boss or not. The
 * candidates are uncut: the target applies later (`applyTarget`), after any
 * mid-sortie narrowing, so a target change hits the cache. The predictor also
 * keeps each map's latest prediction for the Target dropdown's options: the
 * nodes on it, or mid-sortie the nodes still ahead of the fleet.
 *
 * The cache key is the map, the branch and phase choices, and the parts of the
 * fleet that can change a route — ship ids and levels (LoS, speed, ship types)
 * and equipment ids with improvement (LoS, speed, drums …). Proficiency and
 * luck don't route, so a sortie that only changes them still hits the cache.
 * Failures are not cached.
 */
import type { DeckBuilder } from '../fleet/toDeckbuilder'
import { endsAtBoss } from './boss'
import type { ChoiceValues } from './choices'
import type { CompassCandidate } from './compass'

export interface PredictedRoute {
  /** Node letters from the start node to the last node. */
  nodes: string[]
  probability: number
  /** The last node is one of the map's boss letters. */
  endsAtBoss: boolean
}

/** A predicted route after `applyTarget`: cut at a node target, and whether it reaches the target. */
export interface RouteCandidate extends PredictedRoute {
  reachesTarget: boolean
  /** Mid-sortie, the fleet is past the target: reached, its battle over, so not simulated. */
  passedTarget?: boolean
}

export type CompassRunner = (deck: DeckBuilder, map: string, choices: ChoiceValues) => Promise<CompassCandidate[]>

export function predictionKey(deck: DeckBuilder, map: string, choices: ChoiceValues): string {
  const ships = Object.values(deck.f1).map((ship) => [
    ship.id,
    ship.lv,
    Object.entries(ship.items)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, item]) => [slot, item.id, item.rf]),
  ])
  const sortedChoices = Object.entries(choices).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify([map, sortedChoices, ships])
}

export interface Predictor {
  predict(input: { deck: DeckBuilder; map: string; choices: ChoiceValues; bossLetters: string[] }): Promise<PredictedRoute[]>
  /**
   * The map's node letters on its latest prediction, without the start node and boss letters, sorted.
   * With `visited` (mid-sortie, start node first), only the routes through them, from the node the fleet is at on.
   */
  nodesFor(map: string, visited?: string[]): string[]
  /**
   * The boss letters the latest prediction's routes end at (only those through `visited`, mid-sortie), or all
   * the map's boss letters when none does; undefined before the map is predicted.
   */
  bossFor(map: string, visited?: string[]): string[] | undefined
}

/** The routes through `visited` (start node first), or all of them. */
const through = (routes: CompassCandidate[], visited: string[] | undefined): CompassCandidate[] =>
  visited ? routes.filter((c) => visited.every((letter, i) => c.nodes[i] === letter)) : routes

export function createPredictor(runCompass: CompassRunner): Predictor {
  const cache = new Map<string, CompassCandidate[]>()
  const latest = new Map<string, { routes: CompassCandidate[]; bossLetters: string[] }>()
  return {
    async predict({ deck, map, choices, bossLetters }) {
      const key = predictionKey(deck, map, choices)
      let candidates = cache.get(key)
      if (!candidates) {
        candidates = await runCompass(deck, map, choices)
        cache.set(key, candidates)
      }
      latest.set(map, { routes: candidates, bossLetters })
      return candidates.map((c) => ({ ...c, endsAtBoss: endsAtBoss(c.nodes, bossLetters) }))
    },
    nodesFor(map, visited) {
      const last = latest.get(map)
      if (!last) return []
      const from = visited ? visited.length - 1 : 1
      const letters = new Set(through(last.routes, visited).flatMap((c) => c.nodes.slice(from)))
      return [...letters].filter((l) => !last.bossLetters.includes(l)).sort()
    },
    bossFor(map, visited) {
      const last = latest.get(map)
      if (!last) return undefined
      const ends = new Set(through(last.routes, visited).map((c) => c.nodes[c.nodes.length - 1]!))
      const reached = last.bossLetters.filter((l) => ends.has(l))
      return reached.length > 0 ? reached : last.bossLetters
    },
  }
}
