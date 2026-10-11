/**
 * A ship's fuel and ammo as on poi's fleet tab: two thin bars, fuel above
 * ammo, coloured by how full they are; hovering shows the resource icon,
 * `now / max` and, when not full, the resupply cost. A bar whose maximum is
 * unknown is left out.
 */
import { ProgressBar, Tooltip } from '@blueprintjs/core'
import React from 'react'
import { MaterialIcon } from 'views/components/etc/icon'

import type { SupplyView } from './model'

/** poi's material ids. */
const FUEL = 1
const AMMO = 2

function SupplyBar({ supply, materialId }: { supply: SupplyView; materialId: number }) {
  const tip = (
    <span className="battle-sim-supply-tip">
      {/* poi's global CSS sizes `material-icon`. */}
      <MaterialIcon materialId={materialId} className="material-icon" />
      {supply.now} / {supply.max}
      {supply.cost > 0 && ` (-${supply.cost})`}
    </span>
  )
  return (
    <Tooltip content={tip} placement="right" hoverOpenDelay={100} targetTagName="div">
      <ProgressBar stripes={false} animate={false} intent={supply.intent} value={supply.now / supply.max} />
    </Tooltip>
  )
}

export function SupplyBars({ fuel, ammo }: { fuel?: SupplyView; ammo?: SupplyView }) {
  return (
    <div className="battle-sim-supply">
      {fuel && <SupplyBar supply={fuel} materialId={FUEL} />}
      {ammo && <SupplyBar supply={ammo} materialId={AMMO} />}
    </div>
  )
}
