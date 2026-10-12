import { beforeAll, describe, expect, it } from 'vitest'

import { loadShipGateData, possibleSpecial, type ShipGateTable } from '../src/fleet/specialGates'
import type { Formation } from '../src/routes/formation'

// Ship ids from the bundled ships.json: 睦月 (DD), 赤城 (CV), 伊168 (SS), 扶桑 (BB).
const DD = 1
const CV = 83
const SS = 126
const BB = 26

let ships: ShipGateTable
beforeAll(async () => {
  ships = await loadShipGateData('fcd/optimizer')
})

const special = (shipIds: number[], formation: Formation, opts: { night?: boolean; fired?: number[] } = {}) =>
  possibleSpecial({ shipIds, formation, night: opts.night ?? false, fired: opts.fired ?? [] }, ships)

describe('possibleSpecial', () => {
  it('reads the ship data from ships.json', () => {
    expect(ships.get(571)).toEqual({ attackSpecial: 100, type: 'BB' })
  })

  describe('100 Nelson Touch', () => {
    const fleet = [571, DD, DD, DD, DD, DD]
    it('fires in double line', () => expect(special(fleet, 'DoubleLine')).toBe(100))
    it('not in line ahead', () => expect(special(fleet, 'LineAhead')).toBeNull())
    it('not with a carrier in position 3', () => expect(special([571, DD, CV, DD, DD, DD], 'DoubleLine')).toBeNull())
    it('not with a submarine in position 5', () => expect(special([571, DD, DD, DD, SS, DD], 'DoubleLine')).toBeNull())
    it('not once fired earlier in the sortie', () => expect(special(fleet, 'DoubleLine', { fired: [100] })).toBeNull())
    it('not with fewer than 6 surface ships', () => expect(special([571, DD, DD, DD, DD, SS], 'DoubleLine')).toBeNull())
    // Three ships set to double line fight in line ahead (`allowedFormation`), and are too few anyway.
    it('not for a 3-ship fleet', () => expect(special([571, DD, DD], 'LineAhead')).toBeNull())
  })

  describe('101 / 102 長門・陸奥', () => {
    it('fires with a battleship second in echelon', () => {
      expect(special([541, BB, DD, DD, DD, DD], 'Echelon')).toBe(101)
      expect(special([573, BB, DD, DD, DD, DD], 'Echelon')).toBe(102)
    })
    it('not without a battleship second', () => expect(special([541, DD, BB, DD, DD, DD], 'Echelon')).toBeNull())
  })

  describe('103 Colorado', () => {
    it('fires with battleships second and third', () => expect(special([601, BB, BB, DD, DD, DD], 'Echelon')).toBe(103))
    it('not with only one', () => expect(special([601, BB, DD, DD, DD, DD], 'Echelon')).toBeNull())
  })

  describe('104 金剛型 night attack', () => {
    const fleet = [591, 592, DD, DD, DD]
    it('fires at night with a partner second and 5 ships', () => expect(special(fleet, 'LineAhead', { night: true })).toBe(104))
    it('not without night battle', () => expect(special(fleet, 'LineAhead')).toBeNull())
    it('not with a ship that is no partner', () => expect(special([591, BB, DD, DD, DD], 'LineAhead', { night: true })).toBeNull())
    it('still after firing, up to three times', () => {
      expect(special(fleet, 'Echelon', { night: true, fired: [104, 104] })).toBe(104)
      expect(special(fleet, 'Echelon', { night: true, fired: [104, 104, 104] })).toBeNull()
    })
  })

  describe('105 Richelieu / 106 Warspite', () => {
    it('fire with their partner second', () => {
      expect(special([392, 724, DD, DD, DD, DD], 'DoubleLine')).toBe(105)
      expect(special([364, 733, DD, DD, DD, DD], 'Echelon')).toBe(106)
    })
    it('not without', () => {
      expect(special([392, BB, DD, DD, DD, DD], 'DoubleLine')).toBeNull()
      expect(special([364, BB, DD, DD, DD, DD], 'Echelon')).toBeNull()
    })
  })

  describe('400 / 401 大和型', () => {
    it('fires the 3-ship attack with a listed pair, before the 2-ship one', () => {
      expect(special([911, 541, 573, DD, DD, DD], 'Echelon')).toBe(400)
    })
    it('falls back to the 2-ship attack', () => expect(special([911, 546, DD, DD, DD, DD], 'Echelon')).toBe(401))
    it('武蔵改二 fires only the 2-ship attack, with a Yamato second', () => {
      expect(special([546, 911, 541, 573, DD, DD], 'Echelon')).toBe(401)
      expect(special([546, BB, DD, DD, DD, DD], 'Echelon')).toBeNull()
    })
    it('not in line ahead', () => expect(special([911, 541, 573, DD, DD, DD], 'LineAhead')).toBeNull())
  })

  it('locks every other kind once any special fired', () => {
    expect(special([541, BB, DD, DD, DD, DD], 'Echelon', { fired: [104] })).toBeNull()
  })

  it('gives none for a flagship without a special', () => expect(special([BB, BB, DD, DD, DD, DD], 'Echelon')).toBeNull())

  it('gives none for an unknown ship and when the data is missing', () => {
    expect(special([999999, DD, DD, DD, DD, DD], 'Echelon')).toBeNull()
    expect(possibleSpecial({ shipIds: [571, DD, DD, DD, DD, DD], formation: 'DoubleLine', night: false, fired: [] }, new Map())).toBeNull()
  })
})
