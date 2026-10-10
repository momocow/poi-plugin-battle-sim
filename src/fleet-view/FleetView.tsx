/**
 * The fleet display: a summary row (speed, fighter power, LoS at the map's
 * multiplier with ×1/×3/×4 on hover, a damaged-ships warning), then one row
 * per ship after poi's fleet tab — level and type over the name, HP as
 * `now / max` over a bar coloured by damage, morale with poi's coloured
 * square, and the equipment as icons, with name, ★ and proficiency on hover.
 */
import { Popover, ProgressBar, Tooltip } from '@blueprintjs/core'
import React from 'react'

import { t } from '../i18n'
import type { Damage, FleetViewModel, ShipView } from './model'
import { SlotItem } from './SlotItem'

/** poi's HP palette: its global CSS colours these intents on a progress bar. */
const HP_INTENT: Record<Damage, string> = { none: 'green', minor: 'yellow', moderate: 'orange', heavy: 'red' }

function ShipRow({ ship }: { ship: ShipView }) {
  const damageLabel = { none: '', minor: t('Minor damage'), moderate: t('Moderate damage'), heavy: t('Heavy damage') }[
    ship.damage
  ]
  const hp = (
    <div className="battle-sim-ship-hp">
      <div className="battle-sim-ship-hp-line">
        <span>
          {ship.hp} / {ship.maxHp}
        </span>
        <span className={`poi-ship-cond poi-ship-cond-${ship.moraleBand}`}>{ship.morale}</span>
      </div>
      <ProgressBar stripes={false} animate={false} intent={HP_INTENT[ship.damage]} value={ship.hp / ship.maxHp} />
    </div>
  )
  return (
    <div className="battle-sim-ship">
      <div className="battle-sim-ship-info">
        <div className="battle-sim-ship-sub">
          Lv. {ship.level} {ship.typeName}
        </div>
        <div className="battle-sim-ship-name" title={ship.name}>
          {ship.name}
        </div>
      </div>
      {damageLabel ? (
        <Tooltip content={damageLabel} placement="top" targetTagName="div" targetProps={{ className: 'battle-sim-ship-hp-target' }}>
          {hp}
        </Tooltip>
      ) : (
        <div className="battle-sim-ship-hp-target">{hp}</div>
      )}
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
      <div>× 3: {model.los.x3.toFixed(2)}</div>
      <div>× 4: {model.los.x4.toFixed(2)}</div>
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
            {t('LoS')}: {model.los[`x${model.losMultiplier}`].toFixed(2)} (×{model.losMultiplier})
          </span>
        </Popover>
        {model.damagedCount > 0 && (
          <span className="battle-sim-warning">
            {t('{count} damaged', { count: model.damagedCount })}
          </span>
        )}
      </div>
      <div className="battle-sim-ships">
        {model.ships.map((ship, i) => (
          <ShipRow key={i} ship={ship} />
        ))}
      </div>
    </div>
  )
}
