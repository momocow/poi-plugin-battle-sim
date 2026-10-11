/**
 * Every failure the panel can show, as one typed error.
 *
 * `code` picks the summary text and whether Retry is offered; `details` is the
 * expandable part (stderr, an error chain, the offending map or node).
 */
export type ErrorCode =
  | 'FLEET_NOT_LOADED'
  | 'FLEET_EMPTY'
  | 'FLEET_COMBINED'
  | 'BINARY_UNSUPPORTED_PLATFORM'
  | 'BINARY_MISSING'
  | 'BINARY_CORRUPT'
  | 'OPTIMIZER_SCHEMA'
  | 'OPTIMIZER_FAILED'
  | 'COMPASS_UNREACHABLE'
  | 'COMPASS_SHAPE'
  | 'COMPASS_UNSUPPORTED_MAP'
  | 'COMPASS_TIMEOUT'
  /** Mid-sortie: the cells visited cannot be read as node letters from the map's kcnav topology. */
  | 'SORTIE_MAP_UNREADABLE'
  /** Mid-sortie: no predicted route starts with the nodes visited. */
  | 'SORTIE_PATH_UNMATCHED'
  /** A node target without a battle (a resource, empty or maelstrom node); details name it. */
  | 'TARGET_NOT_BATTLE'
  /** A bug or an environment poi should have provided; details carry the cause. */
  | 'INTERNAL'

export class SimError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message)
    this.name = 'SimError'
  }
}

export const isRoutePredictionError = (code: ErrorCode): boolean => code.startsWith('COMPASS_')
