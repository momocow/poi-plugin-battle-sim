/**
 * The normal-map fetch queue (startup, retry, refresh) at the far right of the
 * footer: a spinner whose tooltip shows maps done out of the queue's total and
 * the map being fetched (or next, during the queue's pause), then, if maps failed, a warning-colored download icon
 * (not the triangle, which marks a development optimizer) whose popover
 * lists them with a Retry button. A popover rather than a tooltip, so the
 * pointer can reach the button. Nothing when no queue runs and nothing failed.
 */
import { Button, Icon, Popover, Spinner, Tooltip } from '@blueprintjs/core'
import React, { useSyncExternalStore } from 'react'

import { devLog } from '../devlog'
import { t } from '../i18n'
import { onQueueStatus, queueStatus, type QueueStatus } from '../optimizer/prefetch'
import { fetchNormalMaps } from './runner'

/** The queue's status, re-rendering on each change; shared with the settings page. */
export const useQueueStatus = (): QueueStatus => useSyncExternalStore(onQueueStatus, queueStatus)

/** "Fetching … 12 / 35", or "Refreshing …" for a forced queue. */
export const queueProgressText = ({ force, done, total }: Extract<QueueStatus, { kind: 'running' }>): string =>
  force
    ? t('Refreshing enemy data for normal maps {done} / {total}', { done, total })
    : t('Fetching enemy data for normal maps {done} / {total}', { done, total })

export function NormalMapFetchIndicator() {
  const status = useQueueStatus()
  if (!status) return null
  if (status.kind === 'running') {
    return (
      <Tooltip
        content={
          <div className="battle-sim-map-fetch-tip">
            <div>{queueProgressText(status)}</div>
            <div>
              {status.waiting
                ? t('Next {map}', { map: status.current })
                : t('Now fetching {map}', { map: status.current })}
            </div>
          </div>
        }
        placement="top"
        targetTagName="span"
        targetProps={{ className: 'battle-sim-map-fetch' }}
      >
        <Spinner size={12} />
      </Tooltip>
    )
  }
  const retry = () => {
    fetchNormalMaps({ force: status.force, maps: status.maps }).catch((err: unknown) =>
      devLog('prefetch.unavailable', { error: String(err) }),
    )
  }
  return (
    <Popover
      interactionKind="hover"
      placement="top"
      targetTagName="span"
      targetProps={{ className: 'battle-sim-map-fetch' }}
      content={
        <div className="battle-sim-map-fetch-failed">
          <div>{t('{count} maps not fetched', { count: status.maps.length })}</div>
          <div className="bp6-text-muted">{status.maps.join(', ')}</div>
          <div className="bp6-text-muted">
            {t('Stopped at {map}; kcnav may be refusing requests for now', { map: status.maps[0]! })}
          </div>
          <Button small intent="primary" text={t('Retry')} onClick={retry} />
        </div>
      }
    >
      <Icon icon="cloud-download" intent="warning" size={14} />
    </Popover>
  )
}
