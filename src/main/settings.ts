import fs from 'node:fs'
import { pathsService } from '@src/main/paths'
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

const FILE = (): string => pathsService.userDataFile('settings.json')

let cache: Settings = structuredClone(DEFAULT_SETTINGS)
const listeners = new Set<() => void>()

function deepMerge(base: Settings, patch: Partial<Settings>): Settings {
  const next: Settings = { ...base, ...(patch as Partial<Settings>) }
  if (patch.shortcuts) {
    next.shortcuts = { ...base.shortcuts, ...patch.shortcuts }
  }
  return next
}

function init(): Settings {
  try {
    const raw = fs.readFileSync(FILE(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<Settings>
    cache = deepMerge(DEFAULT_SETTINGS, parsed)
  } catch {
    cache = structuredClone(DEFAULT_SETTINGS)
    save()
  }
  return cache
}

function get(): Settings {
  return cache
}

function update(params: { patch: Partial<Settings> }): Settings {
  cache = deepMerge(cache, params.patch)
  save()
  listeners.forEach((cb) => cb())
  return cache
}

function onChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function save(): void {
  try {
    fs.writeFileSync(FILE(), JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

export const settingsService = {
  defaults: DEFAULT_SETTINGS,
  init,
  get,
  update,
  onChange
}
