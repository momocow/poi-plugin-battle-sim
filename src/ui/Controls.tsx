/**
 * The panel's controls, in rows. The fleet, the map and its phase, with the
 * panel's mode as a tag floating right — plan mode in port, sortie mode while
 * the selected fleet is on a sortie. Then, on maps that have them, the branch
 * choices labeled Route, the target and the Night battle switch, wrapping as
 * needed. Then the action bar: Reset, an icon, at the left; the automatic-run
 * switch and Simulate / Cancel, primary unless Auto is on, at the right. In
 * sortie mode the fleet and map can't be changed (the map shown is the
 * sortie's) and Reset is off, and a branch the fleet has already passed shows
 * the branch taken and can't be changed either. After Reset, the fleet and map selects show an empty choice that can't be picked.
 * The target and switch show once the map's topology is cached (a map's first
 * run fetches it), offering Boss and the predicted battle nodes; they stay
 * editable in sortie mode. At a night-battle target the Night battle switch
 * shows on and is locked, with a tooltip saying why.
 */
import { Button, HTMLSelect, Switch, Tag, Tooltip } from '@blueprintjs/core'
import React from 'react'

import { gameName, t } from '../i18n'
import { choicesFor, type ChoiceValues, type MapChoices } from '../routes/choices'
import type { MapGroup } from './inputs'

export interface ControlsProps {
  /** Null when cleared by Reset. */
  fleetId: number | null
  /** In-game fleet names by fleet id − 1; missing before the game data loads. */
  fleetNames: (string | undefined)[]
  /** Null when cleared by Reset and not on a sortie. */
  map: string | null
  /** Offered maps, grouped by sea area. */
  maps: MapGroup[]
  choices: ChoiceValues
  /** The target row; undefined hides it (no map, or its topology isn't cached yet). */
  target?: {
    /** Undefined for the boss. */
    value: string | undefined
    /** Battle nodes to offer after Boss. */
    options: string[]
    /** The boss letters, to name the Boss option ("Q (Boss)"); undefined before the map is predicted. */
    boss?: string[]
    nightBattle: boolean
    /** The target is a night-battle node: always a night battle, so the switch shows on and is locked. */
    nightOnly: boolean
  }
  /** Branches the fleet has already passed in a sortie of this map: shown as taken, and locked. */
  decided: ChoiceValues
  /** The selected fleet is on a sortie: runs follow it, and the fleet and map are locked. */
  sortieMode: boolean
  auto: boolean
  running: boolean
  /** There is something to run: a fleet and a map, or the selected fleet's sortie. */
  canSimulate: boolean
  onFleet: (fleetId: number) => void
  onMap: (map: string) => void
  onChoice: (key: string, value: string) => void
  onTarget: (target: string | undefined) => void
  onNightBattle: (nightBattle: boolean) => void
  onAuto: (auto: boolean) => void
  onSimulate: () => void
  onCancel: () => void
  onReset: () => void
}

/** Shown only while the select has no selection; disabled, so it can't be picked. */
const EMPTY = { value: '', label: '—', disabled: true }

/** The Boss option's value: not a node letter. */
const BOSS = ''

function fleetOptionLabel(id: number, fleetNames: (string | undefined)[]): string {
  const name = fleetNames[id - 1]
  return name ? `${id}: ${name}` : String(id)
}

function mapOptionLabel(map: string, name: string | undefined): string {
  return name ? `${map} ${gameName(name)}` : map
}

type CheckEvent = { currentTarget: { checked: boolean } }

type ChangeEvent = { currentTarget: { value: string } }

export function Controls(p: ControlsProps) {
  const mapChoices: MapChoices = p.map !== null ? choicesFor(p.map) : { branches: [] }
  // A remembered map that is not offered (e.g. before the game data loads) still shows, ungrouped.
  const mapOffered = p.map === null || p.maps.some((g) => g.maps.some((m) => m.map === p.map))
  const fleetLabel = p.fleetId !== null ? fleetOptionLabel(p.fleetId, p.fleetNames) : null
  const mapName = p.maps.flatMap((g) => g.maps).find((m) => m.map === p.map)?.name
  const mapLabel = p.map !== null ? mapOptionLabel(p.map, mapName) : null
  return (
    <div className="battle-sim-controls">
      <div className="battle-sim-control-row">
        {/* The selects are width-capped, so a tooltip shows the selection's full name. */}
        <Tooltip content={fleetLabel} disabled={fleetLabel === null} placement="bottom" targetTagName="span" targetProps={{ className: 'battle-sim-named' }}>
          <label>
            {t('Fleet')}{' '}
            <HTMLSelect
              className="battle-sim-fleet-select"
              value={p.fleetId ?? ''}
              disabled={p.running || p.sortieMode}
              onChange={(e: ChangeEvent) => p.onFleet(Number(e.currentTarget.value))}
              options={[
                ...(p.fleetId === null ? [EMPTY] : []),
                ...[1, 2, 3, 4].map((id) => ({ value: id, label: fleetOptionLabel(id, p.fleetNames) })),
              ]}
            />
          </label>
        </Tooltip>
        <Tooltip content={mapLabel} disabled={mapLabel === null} placement="bottom" targetTagName="span" targetProps={{ className: 'battle-sim-named' }}>
          <label>
            {t('Map')}{' '}
            <HTMLSelect
              className="battle-sim-map-select"
              value={p.map ?? ''}
              disabled={p.running || p.sortieMode}
              onChange={(e: ChangeEvent) => p.onMap(e.currentTarget.value)}
            >
              {p.map === null && (
                <option value={EMPTY.value} disabled>
                  {EMPTY.label}
                </option>
              )}
              {!mapOffered && <option value={p.map!}>{p.map}</option>}
              {p.maps.map((g) => (
                <optgroup key={g.area} label={g.name ? `${g.area}: ${gameName(g.name)}` : String(g.area)}>
                  {g.maps.map(({ map, name }) => (
                    <option key={map} value={map}>
                      {mapOptionLabel(map, name)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </HTMLSelect>
          </label>
        </Tooltip>
        {mapChoices.phases && (
          <label>
            {t('Phase')}{' '}
            <HTMLSelect
              value={p.choices.phase}
              disabled={p.running}
              onChange={(e: ChangeEvent) => p.onChoice('phase', e.currentTarget.value)}
              options={mapChoices.phases.map((ph) => ({
                value: ph.value,
                label: `${ph.value}: ${t(ph.label)}`,
              }))}
            />
          </label>
        )}
        <div className="battle-sim-float-right">
          <Tooltip
            content={
              <>
                <strong>{t(p.sortieMode ? 'Sortie mode' : 'Plan mode')}</strong>
                <br />
                {p.sortieMode ? t('Runs use the fleet and map of the sortie, following its progress') : t('Runs use the fleet and map selected here')}
              </>
            }
            placement="bottom"
            targetTagName="span"
          >
            {p.sortieMode ? (
              <Tag className="battle-sim-mode" round icon="flag" intent="danger">
                {t('Sortie mode')}
              </Tag>
            ) : (
              <Tag className="battle-sim-mode" round icon="map" intent="none">
                {t('Plan mode')}
              </Tag>
            )}
          </Tooltip>
        </div>
      </div>
      {(mapChoices.branches.length > 0 || p.target) && (
        <div className="battle-sim-control-row">
          {mapChoices.branches.length > 0 && <span>{t('Route')}</span>}
          {mapChoices.branches.map((b) => (
            // A disabled select gets no mouse events, so a taken branch lets the pointer through to the tooltip's target.
            <Tooltip
              key={b.node}
              content={t('Taken in this sortie')}
              disabled={!(b.node in p.decided)}
              placement="top"
              targetTagName="span"
              targetProps={{ className: b.node in p.decided ? 'battle-sim-decided' : undefined }}
            >
              <label>
                {`${b.node} →`}{' '}
                <HTMLSelect
                  value={p.decided[b.node] ?? p.choices[b.node]}
                  disabled={p.running || b.node in p.decided}
                  onChange={(e: ChangeEvent) => p.onChoice(b.node, e.currentTarget.value)}
                  options={b.targets}
                />
              </label>
            </Tooltip>
          ))}
          {p.target && (
            <TargetControls {...p.target} running={p.running} onTarget={p.onTarget} onNightBattle={p.onNightBattle} />
          )}
        </div>
      )}
      <div className="battle-sim-control-row battle-sim-actions">
        {/* Rarely used, so only an icon; a disabled button gets no mouse events, so the tooltip's target is a span. */}
        <Tooltip
          content={
            <>
              <strong>{t('Reset')}</strong>
              <br />
              {t('Clear the fleet and map, so nothing runs until you pick them again')}
            </>
          }
          placement="top"
          targetTagName="span"
          targetProps={{ className: 'battle-sim-reset' }}
        >
          <Button
            variant="minimal"
            icon="reset"
            aria-label={t('Reset')}
            disabled={p.sortieMode || (p.fleetId === null && p.map === null)}
            onClick={p.onReset}
          />
        </Tooltip>
        <div className="battle-sim-float-right battle-sim-run">
          {/* What keeps a sortie's prediction current, so its tooltip says so. */}
          <Tooltip
            content={
              <>
                <strong>{t('Auto')}</strong>
                <br />
                {t('Simulate when the fleet or these settings change')}
                <br />
                {t('In sortie mode, it simulates again at each node the fleet reaches, with the supplies used and the damage taken')}
              </>
            }
            placement="top"
            targetTagName="span"
          >
            <Switch
              className="battle-sim-auto"
              checked={p.auto}
              label={t('Auto')}
              onChange={(e: CheckEvent) => p.onAuto(e.currentTarget.checked)}
            />
          </Tooltip>
          {/* Primary only when it is the way to run: with Auto on, runs start by themselves. */}
          <Button
            intent={p.running || p.auto ? 'none' : 'primary'}
            disabled={!p.running && !p.canSimulate}
            onClick={p.running ? p.onCancel : p.onSimulate}
          >
            {/* Both labels take the same cell, so the button keeps its width when Simulate becomes Cancel. */}
            <span className="battle-sim-run-label">
              <span className={p.running ? 'battle-sim-hidden' : undefined}>{t('Simulate')}</span>
              <span className={p.running ? undefined : 'battle-sim-hidden'}>{t('Cancel')}</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

/** The Target dropdown and the Night battle switch, after the branch choices; they wrap together. */
function TargetControls({
  value,
  options,
  boss,
  nightBattle,
  nightOnly,
  running,
  onTarget,
  onNightBattle,
}: NonNullable<ControlsProps['target']> & Pick<ControlsProps, 'running' | 'onTarget' | 'onNightBattle'>) {
  // A remembered target that is not offered (not predicted yet this session) still shows.
  const letters = value === undefined || options.includes(value) ? options : [...options, value].sort()
  return (
    <span className="battle-sim-target">
      <label>
        {t('Target')}{' '}
        <HTMLSelect
          value={value ?? BOSS}
          disabled={running}
          onChange={(e: ChangeEvent) => onTarget(e.currentTarget.value === BOSS ? undefined : e.currentTarget.value)}
          options={[
            { value: BOSS, label: boss?.length ? t('{node} (Boss)', { node: boss.join('/') }) : t('Boss') },
            ...letters,
          ]}
        />
      </label>
      {/* A disabled switch gets no mouse events, so the pointer goes through to the tooltip's target. */}
      <Tooltip
        content={t('{node} is always a night battle', { node: value ?? '' })}
        disabled={!nightOnly}
        placement="top"
        targetTagName="span"
        targetProps={{ className: nightOnly ? 'battle-sim-decided' : undefined }}
      >
        <Switch
          checked={nightBattle || nightOnly}
          disabled={running || nightOnly}
          label={t('Night battle')}
          title={nightOnly ? undefined : t('Pursue night battle at the target')}
          onChange={(e: CheckEvent) => onNightBattle(e.currentTarget.checked)}
        />
      </Tooltip>
    </span>
  )
}
