/**
 * The run's status, compact enough to sit at the right of the footer: route
 * prediction, routes finished with a progress bar, the enemy-data fetch note,
 * "Done" for a few seconds, and a marker for a development optimizer.
 */
import { Icon, ProgressBar, Spinner, Tooltip } from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'

import { t } from '../i18n'
import { progress, type RunState } from './state'

const DONE_SHOWN_MS = 3000

/** True from the moment `run` reaches done until about 3 seconds later; a new run clears it. */
function useDoneShown(run: RunState): boolean {
  const [shown, setShown] = useState(false)
  const done = run.phase === 'done'
  useEffect(() => {
    setShown(done)
    if (!done) return undefined
    const timer = setTimeout(() => setShown(false), DONE_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [done])
  return shown
}

export function StatusArea({ run }: { run: RunState }) {
  const doneShown = useDoneShown(run)
  const { finished, total } = progress(run)
  return (
    <div className="battle-sim-status">
      {run.phase === 'predicting' && (
        <>
          <Spinner size={14} />
          <span>{t('Predicting routes…')}</span>
        </>
      )}
      {run.phase === 'simulating' && (
        <>
          <span>{`${finished} / ${total}`}</span>
          <div className="battle-sim-progress">
            <ProgressBar value={total > 0 ? finished / total : 0} stripes={false} intent="primary" />
          </div>
        </>
      )}
      {run.phase === 'simulating' && run.fetchingEnemyData && (
        <Tooltip
          content={t('First run of this map — fetching enemy data, this may take 15 seconds or more')}
          placement="top"
          targetTagName="span"
          targetProps={{ className: 'battle-sim-status-note' }}
        >
          <span className="battle-sim-hover battle-sim-muted">{t('Fetching enemy data…')}</span>
        </Tooltip>
      )}
      {doneShown && <span>{t('Done')}</span>}
      {run.devOptimizer && (
        <Tooltip content={t('Development optimizer')} placement="top">
          <Icon icon="warning-sign" intent="warning" />
        </Tooltip>
      )}
    </div>
  )
}
