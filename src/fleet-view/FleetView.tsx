/**
 * The fleet display, after plugin-hensei-nikki's fleets view: a summary row
 * (speed, fighter power, LoS ×1 with ×3/×4 on hover), then one card per ship
 * in a grid — name centred, level and type below it, then its equipment with
 * the expansion slot marked by a leading "+".
 */
import { Popover } from '@blueprintjs/core'
import React from 'react'

import { t } from '../i18n'
import type { FleetViewModel, ShipView } from './model'
import { SlotItem } from './SlotItem'

function ShipRow({ ship }: { ship: ShipView }) {
  return (
    <div className="battle-sim-ship">
      <div className="battle-sim-ship-name" title={ship.name}>
        {ship.name}
      </div>
      <div className="battle-sim-ship-detail">
        <span>Lv.{ship.level}</span>
        <span>{ship.typeName}</span>
      </div>
      <div className="battle-sim-slots">
        {ship.slots.map((slot, i) => (
          <SlotItem key={i} slot={slot} />
        ))}
        {ship.exSlot && <SlotItem slot={ship.exSlot} ex />}
      </div>
    </div>
  )
}

export function FleetView({ model }: { model: FleetViewModel }) {
  const los = (
    <div className="battle-sim-popover">
      <div>{t('Formula 33')}</div>
      <div>× 1: {model.los.x1.toFixed(2)}</div>
      <div>× 3 (6-2, 6-3): {model.los.x3.toFixed(2)}</div>
      <div>× 4 (3-5, 6-1): {model.los.x4.toFixed(2)}</div>
    </div>
  )
  return (
    <div className="battle-sim-fleet">
      <div className="battle-sim-fleet-summary">
        <span>{model.speed}</span>
        <span>
          {t('Fighter Power')}: {model.fighterPower}
        </span>
        <Popover content={los} interactionKind="hover-target" placement="bottom">
          <span className="battle-sim-hover">
            {t('LoS')}: {model.los.x1.toFixed(2)}
          </span>
        </Popover>
      </div>
      <div className="battle-sim-ships">
        {model.ships.map((ship, i) => (
          <ShipRow key={i} ship={ship} />
        ))}
      </div>
    </div>
  )
}
