/**
 * The Node settings button and its popup: every battle node of the map, sorted
 * by letter with the boss marked, each with the reason for its default
 * formation and two selects. One holds Default (naming the default formation)
 * and the six formations; the other the night battle setting, If target (the
 * default), Always or Never. A setting the user chose is marked. A
 * night-battle node always fights at night and an air raid never does, so
 * their night battle shows locked, with a tooltip saying why. Reset all to
 * default clears every node of the map, as picking the defaults would.
 *
 * Edits are a draft of the map's settings, taken when the popup opens; they
 * are handed over only when it closes, however it is closed, and only if they
 * differ from that copy, so a round of edits is one change and nothing runs
 * while the popup is open. Formations the fleet's ship count does not allow
 * are greyed out; a row whose formation is not allowed says which formation
 * the fleet gets instead.
 */
import { Button, HTMLSelect, Popover, Tooltip } from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'

import { t } from '../i18n'
import {
  allowedFormation,
  FORMATIONS,
  type Formation,
  type FormationReason,
  type NightBattle,
  type NodeFormation,
} from '../routes/formation'
import { FORMATION_NAMES } from './views'

const REASONS: Record<FormationReason, string> = {
  submarines: 'Submarines only',
  submarinesMixed: 'Submarines mixed',
  night: 'Night battle',
  air: 'Air battle',
  normal: 'Normal battle',
}

const NIGHT_BATTLES: Record<NightBattle, string> = {
  always: 'Always',
  never: 'Never',
}

/** The user's settings for one map, by node letter; a node without an entry uses the default. */
export interface NodeSettings {
  formations: Record<string, Formation>
  nightBattles: Record<string, NightBattle>
}

/** The selects' value for the default: neither a formation nor a night battle setting. */
const DEFAULT = ''

type ChangeEvent = { currentTarget: { value: string } }

const byLetter = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Whether two records set different values. */
const differ = (a: Record<string, string>, b: Record<string, string>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].some((k) => a[k] !== b[k])

/** The record with `letter` set to `value`, or without it for the default. */
const withEntry = <T extends string>(record: Record<string, T>, letter: string, value: string): Record<string, T> => {
  const { [letter]: _, ...rest } = record
  return value === DEFAULT ? rest : { ...rest, [letter]: value as T }
}

export function NodeSettingsButton({
  nodes,
  saved,
  nightLocks,
  boss,
  shipCount,
  disabled,
  onClose,
}: {
  /** The map's battle nodes, with their default formations and reasons. */
  nodes: Record<string, NodeFormation>
  /** The user's settings for the map. */
  saved: NodeSettings
  /** Nodes whose night battle is fixed: always at a night-battle node, never at an air raid. */
  nightLocks: Record<string, NightBattle>
  /** The map's boss letters. */
  boss: string[]
  /** Ships in the selected fleet; undefined with no fleet selected, which greys nothing out. */
  shipCount: number | undefined
  disabled: boolean
  /** Called on closing with the edited settings, only when they changed. */
  onClose: (settings: NodeSettings) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NodeSettings>(saved)
  const toggle = (next: boolean) => {
    if (next === open) return
    if (next) setDraft(saved)
    else if (differ(draft.formations, saved.formations) || differ(draft.nightBattles, saved.nightBattles)) onClose(draft)
    setOpen(next)
  }
  // A run starting by itself (the fleet advancing, say) disables the button: that closes the popup too.
  useEffect(() => {
    if (disabled) toggle(false)
  }, [disabled])
  const name = (f: Formation) => t(FORMATION_NAMES[f])
  const allowed = (f: Formation) => (shipCount === undefined ? f : allowedFormation(f, shipCount))

  const rows = Object.keys(nodes)
    .sort(byLetter)
    .map((letter) => {
      const node = nodes[letter]!
      const chosen = draft.formations[letter]
      const formation = chosen ?? node.defaultFormation
      const gets = allowed(formation)
      const night = draft.nightBattles[letter]
      const lock = nightLocks[letter]
      return (
        <tr key={letter}>
          <th>
            {letter}
            {boss.includes(letter) && <span className="battle-sim-muted"> {t('Boss')}</span>}
          </th>
          <td className="battle-sim-muted">{t(REASONS[node.reason])}</td>
          <td>
            <HTMLSelect
              className={chosen ? 'battle-sim-setting-set' : undefined}
              value={chosen ?? DEFAULT}
              onChange={(e: ChangeEvent) =>
                setDraft({ ...draft, formations: withEntry(draft.formations, letter, e.currentTarget.value) })
              }
              options={[
                { value: DEFAULT, label: t('Default ({formation})', { formation: name(node.defaultFormation) }) },
                ...FORMATIONS.map((f) => ({ value: f, label: name(f), disabled: allowed(f) !== f })),
              ]}
            />
            {gets !== formation && (
              <div className="battle-sim-formation-note">
                {t('{formation} → {gets} ({count} ships)', { formation: name(formation), gets: name(gets), count: shipCount! })}
              </div>
            )}
          </td>
          <td>
            {/* A disabled select gets no mouse events, so a locked one lets the pointer through to the tooltip's target. */}
            <Tooltip
              content={
                lock === 'always'
                  ? t('{node} is always a night battle', { node: letter })
                  : t('An air raid has no night battle')
              }
              disabled={!lock}
              placement="top"
              targetTagName="span"
              targetProps={{ className: lock ? 'battle-sim-decided' : undefined }}
            >
              <HTMLSelect
                className={night && !lock ? 'battle-sim-setting-set' : undefined}
                value={lock ?? night ?? DEFAULT}
                disabled={lock !== undefined}
                onChange={(e: ChangeEvent) =>
                  setDraft({ ...draft, nightBattles: withEntry(draft.nightBattles, letter, e.currentTarget.value) })
                }
                options={[
                  { value: DEFAULT, label: t('If target') },
                  ...(['always', 'never'] as const).map((v) => ({ value: v, label: t(NIGHT_BATTLES[v]) })),
                ]}
              />
            </Tooltip>
          </td>
        </tr>
      )
    })

  return (
    <Popover
      isOpen={open}
      onInteraction={toggle}
      placement="bottom-start"
      content={
        <div className="battle-sim-node-settings">
          <table>
            <thead>
              <tr>
                <th colSpan={2} />
                <th>{t('Formation')}</th>
                <th>{t('Night battle')}</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          <Button
            small
            variant="minimal"
            icon="reset"
            disabled={Object.keys(draft.formations).length === 0 && Object.keys(draft.nightBattles).length === 0}
            text={t('Reset all to default')}
            onClick={() => setDraft({ formations: {}, nightBattles: {} })}
          />
        </div>
      }
    >
      <Button icon="layout-grid" disabled={disabled} text={t('Node settings')} />
    </Popover>
  )
}
