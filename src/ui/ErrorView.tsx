/**
 * A failure: a short translated summary per error type, the details expandable, Retry for route
 * prediction. Keys avoid ": " and a trailing ".", which poi's i18n strips from keys.
 */
import { Button } from '@blueprintjs/core'
import React from 'react'

import { isRoutePredictionError, type ErrorCode, type SimError } from '../errors'
import { t } from '../i18n'

const SUMMARY: Record<ErrorCode, string> = {
  FLEET_NOT_LOADED: 'Game data is not loaded yet',
  FLEET_EMPTY: 'The selected fleet has no ships',
  FLEET_COMBINED: 'Combined fleets are not supported yet',
  BINARY_UNSUPPORTED_PLATFORM: 'No optimizer is bundled for this platform',
  BINARY_MISSING: 'The optimizer or its data is missing',
  BINARY_CORRUPT: 'The optimizer failed its integrity check',
  OPTIMIZER_SCHEMA: 'The optimizer version is incompatible with this plugin',
  OPTIMIZER_FAILED: 'The optimizer reported an error',
  COMPASS_UNREACHABLE: 'Route prediction failed — the compass page is unreachable',
  COMPASS_SHAPE: 'Route prediction failed — the compass page has an unexpected structure',
  COMPASS_UNSUPPORTED_MAP: 'Route prediction failed — compass does not support this map or fleet',
  COMPASS_TIMEOUT: 'Route prediction failed — compass timed out',
  SORTIE_MAP_UNREADABLE: 'The sortie path could not be read from the map data',
  SORTIE_PATH_UNMATCHED: 'No predicted route matches the sortie path — check the branch choices',
  TARGET_NOT_BATTLE: 'The target node has no battle — pick a battle node as the target',
  GAME_DATA_MISSING: 'The game data package is missing or unreadable — reinstall the plugin',
  EVENT_DIFFICULTY_UNSET: 'Pick a difficulty for this event map',
  EVENT_COMBINED_ONLY: 'Combined fleets are not supported yet on this map',
  INTERNAL: 'Something unexpected went wrong',
}

export const errorSummary = (code: ErrorCode): string => t(SUMMARY[code])

export function ErrorView({ error, onRetry }: { error: SimError; onRetry?: () => void }) {
  return (
    <div className="battle-sim-error">
      <strong>{errorSummary(error.code)}</strong>
      <details>
        <summary>{t('Details')}</summary>
        <pre>{[error.message, ...error.details].join('\n')}</pre>
      </details>
      {onRetry && isRoutePredictionError(error.code) && (
        <Button small onClick={onRetry}>
          {t('Retry')}
        </Button>
      )}
    </div>
  )
}
