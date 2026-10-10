/**
 * Ambient declarations for modules poi provides at runtime.
 *
 * None of these are installed here: poi puts its own node_modules and source
 * root on the require path, and a second copy of react, react-redux or
 * blueprint inside this plugin would shadow poi's and break the shared
 * renderer. Only the surface this plugin uses is declared.
 *
 * `views/*` imports are confined to two files — fleet-view/model.ts (fleet
 * statistics) and fleet-view/SlotItem.tsx (the equipment icon) — so a poi
 * version that renames them breaks in one known place.
 */

declare module 'views/utils/game-utils' {
  type Rec = Record<string, unknown>
  /** `[_equip, $equip, onslot]`, padded with undefined for empty slots. */
  export type EquipData = [Rec, Rec, number | undefined] | undefined
  export type ShipData = [Rec, Rec] | undefined
  export function getTyku(
    equipsData: (EquipData[] | undefined)[],
    landbaseStatus?: number,
  ): { basic: number; min: number; max: number }
  export function getSaku33(
    shipsData: ShipData[],
    equipsData: (EquipData[] | undefined)[],
    teitokuLv: number,
    mapModifier?: number,
    slotCount?: number,
  ): { ship: number; item: number; teitoku: number; total: number }
  export function getFleetSpeed(shipsData: ShipData[]): { speed: number }
  export function getSpeedLabel(speed: number): string
}

declare module 'views/components/etc/icon' {
  import type { ComponentType } from 'react'
  export const SlotitemIcon: ComponentType<{ slotitemId?: number; className?: string; alt?: string }>
}

declare module 'react-redux' {
  export function useSelector<S, T>(selector: (state: S) => T, equalityFn?: (a: T, b: T) => boolean): T
  export function shallowEqual(a: unknown, b: unknown): boolean
}

declare module '@blueprintjs/core' {
  import type { ComponentType, ReactNode } from 'react'
  type Props = { [key: string]: unknown; children?: ReactNode }
  export const Button: ComponentType<Props>
  export const HTMLSelect: ComponentType<Props>
  export const Icon: ComponentType<Props>
  export const Popover: ComponentType<Props>
  export const ProgressBar: ComponentType<Props>
  export const Spinner: ComponentType<Props>
  export const Switch: ComponentType<Props>
  export const Tooltip: ComponentType<Props>
  export const Tag: ComponentType<Props>
}
