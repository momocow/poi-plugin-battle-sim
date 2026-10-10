/**
 * Panel text and game names, both through poi's i18n.
 *
 * poi loads `i18n/<locale>.json` (zh-TW, ja-JP, en-US here) as an i18next
 * namespace named after `poiPlugin.id` and follows its own language setting,
 * so nothing here tracks the language. NAMESPACE must match `poiPlugin.id`.
 *
 * Ship and equipment names go through poi's `resources` namespace instead,
 * which is how poi itself localizes master-data names.
 */
import { translateIn } from './poi'

export const NAMESPACE = 'poi_battle_sim'

/** Translate a panel string; `{name}` placeholders are filled from `vars`. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const text = translateIn(NAMESPACE, key)
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

export function gameName(name: string): string {
  return translateIn('resources', name)
}
