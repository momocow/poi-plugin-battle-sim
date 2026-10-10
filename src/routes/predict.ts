/**
 * Route prediction for a fleet on a map: compass only, cached for the poi
 * session, with each candidate marked as reaching the boss or not.
 *
 * The cache key is the map, the branch and phase choices, and the parts of the
 * fleet that can change a route — ship ids and levels (LoS, speed, ship types)
 * and equipment ids with improvement (LoS, speed, drums …). Proficiency and
 * luck don't route, so a sortie that only changes them still hits the cache.
 * Failures are not cached.
 */
import type { DeckBuilder } from '../fleet/toDeckbuilder'
import { reachesBoss } from './boss'
import type { ChoiceValues } from './choices'
import type { CompassCandidate } from './compass'

export interface RouteCandidate {
  /** Node letters from the start node to the last node. */
  nodes: string[]
  probability: number
  reachesBoss: boolean
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
  predict(input: { deck: DeckBuilder; map: string; choices: ChoiceValues; bossLetters: string[] }): Promise<RouteCandidate[]>
}

export function createPredictor(runCompass: CompassRunner): Predictor {
  const cache = new Map<string, CompassCandidate[]>()
  return {
    async predict({ deck, map, choices, bossLetters }) {
      const key = predictionKey(deck, map, choices)
      let candidates = cache.get(key)
      if (!candidates) {
        candidates = await runCompass(deck, map, choices)
        cache.set(key, candidates)
      }
      return candidates.map((c) => ({ ...c, reachesBoss: reachesBoss(c.nodes, bossLetters) }))
    },
  }
}
