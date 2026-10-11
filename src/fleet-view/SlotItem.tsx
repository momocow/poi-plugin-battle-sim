/**
 * One equipment icon, as on poi's fleet tab; hovering shows the name, ★N and
 * the proficiency image. The expansion slot is set apart by a leading "+".
 */
import { Tooltip } from '@blueprintjs/core'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import React from 'react'
import { SlotitemIcon } from 'views/components/etc/icon'

import { poiRoot } from '../poi'
import type { SlotView } from './model'

const proficiencyImage = (alv: number): string | undefined => {
  const root = poiRoot()
  return root ? pathToFileURL(join(root, 'assets', 'img', 'airplane', `alv${alv}.png`)).href : undefined
}

export function SlotItem({ slot, ex = false }: { slot: SlotView; ex?: boolean }) {
  const alv = slot.proficiency >= 1 && slot.proficiency <= 7 ? proficiencyImage(slot.proficiency) : undefined
  const details = (
    <div className="battle-sim-slot-tip">
      <span>{slot.name}</span>
      {slot.improvement > 0 && <strong className="battle-sim-star">★{slot.improvement}</strong>}
      {alv && <img className="battle-sim-alv" alt={`+${slot.proficiency}`} src={alv} />}
    </div>
  )
  return (
    <>
      {ex && <span className="battle-sim-ex-mark">+</span>}
      <Tooltip content={details} placement="top" hoverOpenDelay={100} targetTagName="span">
        <SlotitemIcon className="battle-sim-slot-icon" slotitemId={slot.iconId} alt={slot.name} />
      </Tooltip>
    </>
  )
}
