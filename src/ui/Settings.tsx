/**
 * poi's settings page for this plugin: the trial count, the rank display,
 * the automatic-run delay, the developer log switch, the game data version in
 * use, and the development optimizer override. poi derives
 * no UI from config keys, so without this they could only be set by editing
 * config.cson.
 */
import { HTMLSelect, RadioGroup, Switch } from '@blueprintjs/core'
import React, { useState, useSyncExternalStore } from 'react'

import { devLogPath } from '../devlog'
import { gameData, isBundled, onGameData, workDirOrNone } from '../gameData/store'
import { t } from '../i18n'
import { readConfig, writeConfig } from '../poi'
import {
  AUTO_RUN_DELAY_KEY,
  clampTrials,
  DEFAULT_AUTO_RUN_DELAY_MS,
  DEFAULT_TRIALS,
  DEV_LOG_KEY,
  isTrialPreset,
  loadAutoRunDelay,
  loadDevLog,
  MAX_AUTO_RUN_DELAY_MS,
  MAX_TRIALS,
  OPTIMIZER_BIN_KEY,
  OPTIMIZER_DATA_KEY,
  parseRankDisplay,
  RANK_DISPLAY_KEY,
  TRIAL_PRESETS,
  TRIALS_KEY,
} from './inputs'

const CUSTOM = 'custom'

/** A preset, or Custom with a count field; the field saves only a whole number in range. */
function TrialsSetting() {
  const [count, setCount] = useState(() => String(clampTrials(readConfig<unknown>(TRIALS_KEY, DEFAULT_TRIALS))))
  // Custom stays chosen even when its count happens to equal a preset.
  const [custom, setCustom] = useState(() => !isTrialPreset(Number(count)))
  const presetLabels = [t('Quick'), t('Normal'), t('Precise')]
  const options = [
    ...TRIAL_PRESETS.map((n, i) => ({ value: String(n), label: `${presetLabels[i]} (${n})` })),
    { value: CUSTOM, label: t('Custom') },
  ]
  return (
    <div className="battle-sim-setting">
      <div>{t('Trials')}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <HTMLSelect
          value={custom ? CUSTOM : count}
          options={options}
          onChange={(e: { currentTarget: { value: string } }) => {
            const value = e.currentTarget.value
            setCustom(value === CUSTOM)
            if (value !== CUSTOM) {
              setCount(value)
              writeConfig(TRIALS_KEY, Number(value))
            }
          }}
        />
        {custom && (
          <input
            className="bp6-input"
            style={{ width: '7em' }}
            type="number"
            min={1}
            max={MAX_TRIALS}
            step={100}
            value={count}
            aria-label={t('Trials')}
            onChange={(e) => {
              const text = e.currentTarget.value
              setCount(text)
              const n = Number(text)
              if (text.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_TRIALS) writeConfig(TRIALS_KEY, n)
            }}
          />
        )}
      </div>
      <div className="bp6-text-muted">
        {t('Trials per route, more being more precise but slower; Custom accepts 1–100000, default {n}', {
          n: DEFAULT_TRIALS,
        })}
      </div>
    </div>
  )
}

function PathSetting({ configKey, label, hint }: { configKey: string; label: string; hint: string }) {
  const [value, setValue] = useState(() => String(readConfig<unknown>(configKey, '') ?? ''))
  return (
    <label className="battle-sim-setting">
      <div>{label}</div>
      <input
        className="bp6-input bp6-fill"
        type="text"
        spellCheck={false}
        value={value}
        placeholder={hint}
        onChange={(e) => {
          setValue(e.currentTarget.value)
          writeConfig(configKey, e.currentTarget.value.trim())
        }}
      />
    </label>
  )
}

function RankDisplaySetting() {
  const [mode, setMode] = useState(() => parseRankDisplay(readConfig<unknown>(RANK_DISPLAY_KEY, undefined)))
  return (
    <div className="battle-sim-setting">
      <RadioGroup
        label={t('Rank display')}
        inline
        selectedValue={mode}
        options={[
          { value: 'individual', label: t('Individual (S / A / B)') },
          { value: 'cumulative', label: t('Cumulative (S / A+ / B+)') },
        ]}
        onChange={(e: { currentTarget: { value: string } }) => {
          const next = parseRankDisplay(e.currentTarget.value)
          setMode(next)
          writeConfig(RANK_DISPLAY_KEY, next)
        }}
      />
      <div className="bp6-text-muted">
        {t('Individual shows how often each rank happens; cumulative shows A or better and B or better')}
      </div>
    </div>
  )
}

/** Saves only a whole number in range, so a half-typed or cleared field never stores garbage. */
function AutoRunDelaySetting() {
  const [value, setValue] = useState(() => String(loadAutoRunDelay()))
  return (
    <label className="battle-sim-setting">
      <div>{t('Automatic run delay (ms)')}</div>
      <input
        className="bp6-input"
        type="number"
        min={0}
        max={MAX_AUTO_RUN_DELAY_MS}
        step={100}
        value={value}
        onChange={(e) => {
          const text = e.currentTarget.value
          setValue(text)
          const ms = Number(text)
          if (text.trim() !== '' && Number.isInteger(ms) && ms >= 0 && ms <= MAX_AUTO_RUN_DELAY_MS) {
            writeConfig(AUTO_RUN_DELAY_KEY, ms)
          }
        }}
      />
      <div className="bp6-text-muted">
        {t('How long the fleet and inputs must stay unchanged before a run starts by itself; 0–60000, default {ms}', {
          ms: DEFAULT_AUTO_RUN_DELAY_MS,
        })}
      </div>
    </label>
  )
}

/** The game data version in use, and whether it came with the plugin or from an update; follows an update live. */
function GameDataVersion() {
  const data = useSyncExternalStore(onGameData, gameData)
  return (
    <div className="battle-sim-setting">
      <div>{t('Game data')}</div>
      <div className="bp6-text-muted">
        {!data
          ? t('Not available')
          : isBundled(data, workDirOrNone())
            ? t('{version}, installed with the plugin', { version: data.version })
            : t('{version}, from an update', { version: data.version })}
      </div>
    </div>
  )
}

function DevLogSetting() {
  const [on, setOn] = useState(loadDevLog)
  let path: string | undefined
  try {
    path = devLogPath()
  } catch {
    path = undefined
  }
  return (
    <div className="battle-sim-setting">
      <Switch
        checked={on}
        label={t('Developer log')}
        onChange={(e: { currentTarget: { checked: boolean } }) => {
          setOn(e.currentTarget.checked)
          writeConfig(DEV_LOG_KEY, e.currentTarget.checked)
        }}
      />
      <div className="bp6-text-muted">
        {t('Writes a detailed log of sorties and runs, for checking behavior afterwards, to {path}', {
          path: path ?? 'logs/dev.ndjson',
        })}
      </div>
    </div>
  )
}

export function Settings() {
  return (
    <div className="battle-sim-settings" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TrialsSetting />
      <RankDisplaySetting />
      <AutoRunDelaySetting />
      <DevLogSetting />
      <GameDataVersion />
      <div>{t('Development optimizer')}</div>
      <PathSetting
        configKey={OPTIMIZER_BIN_KEY}
        label={t('Optimizer binary')}
        hint={t('Absolute path; leave empty to use the bundled optimizer')}
      />
      <PathSetting
        configKey={OPTIMIZER_DATA_KEY}
        label={t('Optimizer data directory')}
        hint={t('Absolute path; leave empty to use the game data package')}
      />
      <div className="bp6-text-muted">
        {t('A binary set here skips the integrity check and applies from the next run')}
      </div>
    </div>
  )
}
