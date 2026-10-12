/**
 * The Formations button and its popup: every battle node of the map, sorted
 * by letter with the boss marked, each with the reason for its default and a
 * select holding Default (naming the default formation) and the six
 * formations. A node the user set is marked. Reset all to default clears
 * every node of the map, as picking Default on each would.
 *
 * Edits are a draft of the map's formations, taken when the popup opens; they
 * are handed over only when it closes, however it is closed, and only if they
 * differ from that copy, so a round of edits is one change and nothing runs
 * while the popup is open. Formations the fleet's ship count does not allow
 * are greyed out; a row whose formation is not allowed says which formation
 * the fleet gets instead.
 */
import { Button, HTMLSelect, Popover } from '@blueprintjs/core'
import React, { useEffect, useState } from 'react'

import { t } from '../i18n'
import { allowedFormation, FORMATIONS, type Formation, type FormationReason, type NodeFormation } from '../routes/formation'

/** Full and short names, as i18n keys. */
export const FORMATION_NAMES: Record<Formation, string> = {
  LineAhead: 'Line ahead',
  DoubleLine: 'Double line',
  Diamond: 'Diamond',
  Echelon: 'Echelon',
  LineAbreast: 'Line abreast',
  Vanguard: 'Vanguard',
}

const REASONS: Record<FormationReason, string> = {
  submarines: 'Submarines only',
  submarinesMixed: 'Submarines mixed',
  night: 'Night battle',
  air: 'Air battle',
  normal: 'Normal battle',
}

/** The select's value for Default: not a formation. */
const DEFAULT = ''

type ChangeEvent = { currentTarget: { value: string } }

const byLetter = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Whether the two drafts set different formations. */
const differ = (a: Record<string, Formation>, b: Record<string, Formation>) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].some((k) => a[k] !== b[k])

export function FormationsButton({
  nodes,
  saved,
  boss,
  shipCount,
  disabled,
  onClose,
}: {
  /** The map's battle nodes, with their defaults and reasons. */
  nodes: Record<string, NodeFormation>
  /** The user's formations for the map. */
  saved: Record<string, Formation>
  /** The map's boss letters. */
  boss: string[]
  /** Ships in the selected fleet; undefined with no fleet selected, which greys nothing out. */
  shipCount: number | undefined
  disabled: boolean
  /** Called on closing with the edited formations, only when they changed. */
  onClose: (formations: Record<string, Formation>) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, Formation>>(saved)
  const toggle = (next: boolean) => {
    if (next === open) return
    if (next) setDraft(saved)
    else if (differ(draft, saved)) onClose(draft)
    setOpen(next)
  }
  // A run starting by itself (the fleet advancing, say) disables the button: that closes the popup too.
  useEffect(() => {
    if (disabled) toggle(false)
  }, [disabled])
  const set = (letter: string, value: string) => {
    const { [letter]: _, ...rest } = draft
    setDraft(value === DEFAULT ? rest : { ...rest, [letter]: value as Formation })
  }
  const name = (f: Formation) => t(FORMATION_NAMES[f])
  const allowed = (f: Formation) => (shipCount === undefined ? f : allowedFormation(f, shipCount))

  const rows = Object.keys(nodes)
    .sort(byLetter)
    .map((letter) => {
      const node = nodes[letter]!
      const chosen = draft[letter]
      const formation = chosen ?? node.defaultFormation
      const gets = allowed(formation)
      return (
        <tr key={letter} className={chosen ? 'battle-sim-formation-set' : undefined}>
          <th>
            {letter}
            {boss.includes(letter) && <span className="battle-sim-muted"> {t('Boss')}</span>}
          </th>
          <td className="battle-sim-muted">{t(REASONS[node.reason])}</td>
          <td>
            <HTMLSelect
              value={chosen ?? DEFAULT}
              onChange={(e: ChangeEvent) => set(letter, e.currentTarget.value)}
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
        </tr>
      )
    })

  return (
    <Popover
      isOpen={open}
      onInteraction={toggle}
      placement="bottom-start"
      content={
        <div className="battle-sim-formations">
          <table>
            <tbody>{rows}</tbody>
          </table>
          <Button
            small
            variant="minimal"
            icon="reset"
            disabled={Object.keys(draft).length === 0}
            text={t('Reset all to default')}
            onClick={() => setDraft({})}
          />
        </div>
      }
    >
      <Button icon="layout-grid" disabled={disabled} text={t('Formations')} />
    </Popover>
  )
}
