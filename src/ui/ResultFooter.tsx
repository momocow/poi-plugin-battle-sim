/**
 * The panel's footer: on the left, what a result was run with — map (with the
 * node the fleet was at mid-sortie), fleet, snapshot time, trials and its
 * margin of error, choices, a node target and night battle off at the target — ending with a
 * marker when a mid-sortie result can't know the special attacks fired earlier
 * and one when the settings have moved on since, so neither adds a line; on the
 * right, the run's status, then the normal-map fetch queue's spinner or
 * failure marker at the far right.
 */
import { Icon, Tooltip } from '@blueprintjs/core'
import React from 'react'

import { t } from '../i18n'
import { describeChoices } from '../routes/choices'
import type { RunInput } from './state'
import { NormalMapFetchIndicator } from './NormalMapFetchIndicator'
import { marginOfError, pct } from './views'

export interface FooterResult {
  input: RunInput
  capturedAt: number
  /** Mid-sortie, once routes are narrowed: the node the fleet was at. */
  at?: string
  /** Mid-sortie, when the sortie wasn't seen from its start. */
  sortieUnobserved?: boolean
  /** Whether the run pursues night battle at its target; unknown until the run resolves it. */
  nightBattleAtTarget?: boolean
}

export function ResultFooter({
  result,
  stale,
  status,
}: {
  result?: FooterResult
  stale: boolean
  status: React.ReactNode
}) {
  return (
    <div className="battle-sim-footer">
      <div className={`battle-sim-footer-result${stale ? ' battle-sim-stale' : ''}`}>
        {result && <ResultLine {...result} stale={stale} />}
      </div>
      {status}
      <NormalMapFetchIndicator />
    </div>
  )
}

function ResultLine({
  input,
  capturedAt,
  at,
  sortieUnobserved,
  nightBattleAtTarget,
  stale,
}: FooterResult & { stale: boolean }) {
  const choices = describeChoices(input.map, input.choices, t('Phase'))
  const parts = [
    at ? t('{map} at {node}', { map: input.map, node: at }) : input.map,
    t('Fleet {id}', { id: input.fleetId }),
    t('Snapshot {time}', { time: new Date(capturedAt).toLocaleTimeString() }),
    t('{trials} trials per route', { trials: input.trials }),
    `±${pct(marginOfError(input.trials))}`,
    ...(choices ? [choices] : []),
    ...(input.target !== undefined ? [t('Target {node}', { node: input.target })] : []),
    ...(nightBattleAtTarget === false ? [t('No night battle')] : []),
  ]
  return (
    <div className="battle-sim-muted">
      {parts.join(' · ')}
      {/* A marker, not a line of its own, so the result line keeps its place. */}
      {sortieUnobserved && (
        <Tooltip
          content={t('Special attacks fired earlier in this sortie are not known')}
          placement="top"
          targetTagName="span"
          targetProps={{ className: 'battle-sim-footer-marker' }}
        >
          <Icon icon="eye-off" intent="warning" size={12} />
        </Tooltip>
      )}
      {stale && (
        <Tooltip
          content={t('Settings have changed since this result')}
          placement="top"
          targetTagName="span"
          targetProps={{ className: 'battle-sim-footer-marker' }}
        >
          <Icon icon="history" size={12} />
        </Tooltip>
      )}
    </div>
  )
}
