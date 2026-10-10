/**
 * One equipment line: poi's icon, name, ★N and the proficiency image. The name
 * is cut off with "…" in a narrow card; hovering shows the full name. This is
 * the only module that imports poi's icon component.
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
  return (
    <div className={ex ? 'battle-sim-slot battle-sim-slot-ex' : 'battle-sim-slot'}>
      {ex && <span className="battle-sim-ex-mark">+</span>}
      <SlotitemIcon className="battle-sim-slot-icon" slotitemId={slot.iconId} />
      <Tooltip
        content={slot.name}
        placement="top"
        hoverOpenDelay={200}
        targetTagName="span"
        targetProps={{ className: 'battle-sim-slot-name-target' }}
      >
        <span className="battle-sim-slot-name">{slot.name}</span>
      </Tooltip>
      {slot.improvement > 0 && <strong className="battle-sim-star">★{slot.improvement}</strong>}
      {alv && <img className="battle-sim-alv" alt={`+${slot.proficiency}`} src={alv} />}
    </div>
  )
}
