import fs from 'node:fs'
import { pathsService } from '@src/main/util/paths-service'
import type { Settings } from '@src/shared/types'

const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    auto: 'CommandOrControl+Shift+R',
    sr: 'CommandOrControl+Shift+S',
    en: 'CommandOrControl+Shift+E',
    stop: 'CommandOrControl+Shift+Q'
  },
  voiceSr: 'sr_Marko_medium',
  voiceEn: 'en_US-lessac-medium',
  rate: 1.0,
  cleanText: true,
  stripBrackets: false,
  startHidden: true,
  showTray: true,
  maxChars: 6000
}

let cache: Settings = structuredClone(DEFAULT_SETTINGS)
const listeners = new Set<() => void>()

function _settingsFilePath(): string {
  return pathsService.userDataFile('settings.json')
}

function _deepMergeSettings(params: { base: Settings; patch: Partial<Settings> }): Settings {
  const { base, patch } = params
  const next: Settings = { ...base, ...(patch as Partial<Settings>) }
  if (patch.shortcuts) {
    next.shortcuts = { ...base.shortcuts, ...patch.shortcuts }
  }
  return next
}

function _persistSettingsToDisk(): void {
  try {
    fs.writeFileSync(_settingsFilePath(), JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

export const settingsService = {
  defaults: DEFAULT_SETTINGS,

  init(): Settings {
    try {
      const raw = fs.readFileSync(_settingsFilePath(), 'utf8')
      const parsed = JSON.parse(raw) as Partial<Settings>
      cache = _deepMergeSettings({ base: DEFAULT_SETTINGS, patch: parsed })
    } catch {
      cache = structuredClone(DEFAULT_SETTINGS)
      _persistSettingsToDisk()
    }
    return cache
  },

  get(): Settings {
    return cache
  },

  update(params: { patch: Partial<Settings> }): Settings {
    cache = _deepMergeSettings({ base: cache, patch: params.patch })
    _persistSettingsToDisk()
    listeners.forEach((cb) => {
      cb()
    })
    return cache
  },

  onChange(cb: () => void): () => void {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }
}
