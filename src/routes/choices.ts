/**
 * Player-chosen branches and map phases, as compass models them, from the
 * map-choices part of the game-data package version in use, so a new map's
 * choices arrive with a data update.
 *
 * Compass keeps one fixed choice per choosable node in `options[map]` (its
 * defaults are the package's `default` values) and `phase` where a map has
 * phases. It does not expose which targets a node can take, and its routing
 * simply follows whatever value is set — so the targets come from compass's
 * map edge table: each choosable node's outgoing edges. The injected script
 * checks these keys against `options[map]` at run time, which catches compass
 * changing its set of choices.
 */
import { gameData } from '../gameData/store'


export interface BranchChoice {
  node: string
  targets: string[]
  default: string
}

export interface PhaseOption {
  value: string
  /** English label; translated in the panel. */
  label: string
}

export interface MapChoices {
  branches: BranchChoice[]
  phases?: PhaseOption[]
}

/** Values to apply: node letter → target, plus `phase` where the map has one. */
export type ChoiceValues = Record<string, string>

const NONE: MapChoices = { branches: [] }

/** The map's choices; none for a map the data doesn't list, or without usable data. */
export const choicesFor = (map: string): MapChoices => gameData()?.mapChoices[map] ?? NONE

/** The keys compass's `options[map]` must have, sorted. */
export function choiceKeys(map: string): string[] {
  const c = choicesFor(map)
  return [...c.branches.map((b) => b.node), ...(c.phases ? ['phase'] : [])].sort()
}

export function defaultChoices(map: string): ChoiceValues {
  const c = choicesFor(map)
  const values: ChoiceValues = Object.fromEntries(c.branches.map((b) => [b.node, b.default]))
  if (c.phases?.[0]) values.phase = c.phases[0].value
  return values
}

/** Saved values for a map, with anything unknown or stale replaced by the default. */
export function normalizeChoices(map: string, saved: unknown): ChoiceValues {
  const values = defaultChoices(map)
  const c = choicesFor(map)
  const s = saved !== null && typeof saved === 'object' ? (saved as Record<string, unknown>) : {}
  for (const b of c.branches) {
    const v = s[b.node]
    if (typeof v === 'string' && b.targets.includes(v)) values[b.node] = v
  }
  const phase = s.phase
  if (c.phases && typeof phase === 'string' && c.phases.some((p) => p.value === phase)) values.phase = phase
  return values
}

/** e.g. "F→J, H→I, O→P, Phase 2", for the summary. Empty for maps without choices. */
export function describeChoices(map: string, values: ChoiceValues, phaseLabel = 'Phase'): string {
  const c = choicesFor(map)
  const parts = c.branches.map((b) => `${b.node}→${values[b.node] ?? b.default}`)
  if (c.phases && values.phase) parts.push(`${phaseLabel} ${values.phase}`)
  return parts.join(', ')
}
