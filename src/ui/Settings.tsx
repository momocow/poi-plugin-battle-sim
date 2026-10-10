/**
 * poi's settings page for this plugin: the development optimizer override.
 * poi derives no UI from config keys, so without this the paths could only be
 * set by editing config.cson.
 */
import React, { useState } from 'react'

import { t } from '../i18n'
import { readConfig, writeConfig } from '../poi'
import { OPTIMIZER_BIN_KEY, OPTIMIZER_DATA_KEY } from './inputs'

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

export function Settings() {
  return (
    <div className="battle-sim-settings" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
