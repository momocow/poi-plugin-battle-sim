/**
 * The game-data package's update prompt, at the far right of the footer: an
 * icon while a newer version is available, and a popup on it showing the
 * version in use and the new one, with Update and Later.
 *
 * The popup opens by itself once per available version in a poi session, but
 * only while the plugin is in view and no other popup is open; otherwise it
 * waits for that. It also waits for the icon to stop moving: poi slides the
 * plugin's tab into view, and a popup opened during the slide would be placed
 * against where the icon was then, away from it, as it is never placed again.
 * Hovering over the icon opens it at any time, and it stays open while the
 * pointer is over it, so its buttons can be reached; the icon has no tooltip
 * of its own. Later, or closing it any other way, keeps the icon and doesn't
 * open it by itself again for that version. Update shows the download, then that the new version is in use
 * from the next run, and closes after a moment; a failure says why and offers
 * Update again. Nothing here starts, cancels or dims a run.
 */
import { Button, Icon, Popover, Spinner } from '@blueprintjs/core'
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { gameData, onGameData } from '../gameData/store'
import { applyUpdate, onUpdateStatus, updateStatus } from '../gameData/update'
import { t } from '../i18n'
import { workDir } from '../paths'
import { takeAutoOpen } from './views'

/** How long the success message stays before the popup closes. */
const DONE_CLOSE_MS = 3000

/** Frames the icon must keep its place before the popup opens by itself, and the most frames to wait. */
const STILL_FRAMES = 5
const MAX_FRAMES = 120

/** Call `then` once `el` has kept its place for a few frames (or after about two seconds); returns a cancel. */
function whenStill(el: () => Element | null, then: () => void): () => void {
  let frame = 0
  let still = 0
  let last = ''
  let id = requestAnimationFrame(function tick() {
    const rect = el()?.getBoundingClientRect()
    const at = rect ? `${rect.left},${rect.top},${rect.width}` : ''
    still = rect && rect.width > 0 && at === last ? still + 1 : 0
    last = at
    if (still >= STILL_FRAMES || ++frame >= MAX_FRAMES) then()
    else id = requestAnimationFrame(tick)
  })
  return () => cancelAnimationFrame(id)
}

export function DataUpdate({ canAutoOpen }: { canAutoOpen: boolean }) {
  const status = useSyncExternalStore(onUpdateStatus, updateStatus)
  const inUse = useSyncExternalStore(onGameData, gameData)?.version
  const [open, setOpen] = useState(false)
  const available = status.available?.version
  const icon = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Marked as opened only once it opens: leaving the tab during the wait cancels it, for the next time in view.
    if (available && canAutoOpen) return whenStill(() => icon.current, () => takeAutoOpen(available, true) && setOpen(true))
  }, [available, canAutoOpen])
  useEffect(() => {
    if (status.phase !== 'done' || !open) return
    const timer = setTimeout(() => setOpen(false), DONE_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [status.phase, open])

  // After a success the icon goes once the popup has closed.
  if (!available && !(open && status.phase === 'done')) return null
  const update = () => {
    let work: string
    try {
      work = workDir()
    } catch {
      return
    }
    void applyUpdate({ work })
  }
  const content =
    status.phase === 'done' ? (
      <div className="battle-sim-data-update">
        <div>{t('Game data {version} is in use from the next run', { version: status.installed ?? '' })}</div>
      </div>
    ) : (
      <div className="battle-sim-data-update">
        <div>
          <strong>{t('A game data update is available')}</strong>
        </div>
        <div className="bp6-text-muted">{t('In use {current} → available {next}', { current: inUse ?? '—', next: available ?? '' })}</div>
        {status.phase === 'failed' && <div className="bp6-text-danger">{t('The update failed — {error}', { error: status.error ?? '' })}</div>}
        <div className="battle-sim-data-update-actions">
          {status.phase === 'downloading' ? (
            <>
              <Spinner size={14} /> {t('Downloading')}
            </>
          ) : (
            <>
              <Button small intent="primary" text={t('Update')} onClick={update} />
              <Button small variant="minimal" text={t('Later')} onClick={() => setOpen(false)} />
            </>
          )}
        </div>
      </div>
    )
  return (
    <Popover
      isOpen={open}
      interactionKind="hover"
      // Closing while it downloads hides the popup; the download goes on, and the icon shows its outcome.
      onInteraction={(next: boolean) => setOpen(next)}
      placement="top-end"
      targetTagName="span"
      targetProps={{ className: 'battle-sim-data-update-icon' }}
      content={content}
    >
      <span ref={icon}>
        <Icon icon="cloud-download" intent="primary" size={14} />
      </span>
    </Popover>
  )
}
