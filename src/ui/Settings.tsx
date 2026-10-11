/**
 * poi's settings page for this plugin: the automatic-run delay and the
 * development optimizer override. poi derives no UI from config keys, so
 * without this they could only be set by editing config.cson.
 */
import React, { useState } from 'react'

import { t } from '../i18n'
import { readConfig, writeConfig } from '../poi'
import {
  AUTO_RUN_DELAY_KEY,
  DEFAULT_AUTO_RUN_DELAY_MS,
  loadAutoRunDelay,
  MAX_AUTO_RUN_DELAY_MS,
  OPTIMIZER_BIN_KEY,
  OPTIMIZER_DATA_KEY,
} from './inputs'

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

export function Settings() {
  return (
    <div className="battle-sim-settings" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AutoRunDelaySetting />
      <div>{t('Development optimizer')}</div>
      <PathSetting
        configKey={OPTIMIZER_BIN_KEY}
        label={t('Optimizer binary')}
        hint={t('Absolute path; leave empty to use the bundled optimizer')}
      />
      <PathSetting
        configKey={OPTIMIZER_DATA_KEY}
        label={t('Optimizer data directory')}
        hint={t('Absolute path; leave empty to use the bundled data')}
      />
      <div className="bp6-text-muted">
        {t('A binary set here skips the integrity check and applies from the next run')}
      </div>
    </div>
  )
}
