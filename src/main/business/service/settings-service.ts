import fs from 'node:fs'
import { pathsService } from '@src/main/util/paths-service'
import type { LanguageBinding, Settings } from '@src/shared/types'

/**
 * Pre-electron-settings shape: two hardcoded language voices and a fixed
 * shortcuts object. Recognized only when migrating an older `settings.json`
 * that predates `languageBindings`.
 */
interface LegacyShortcuts {
  auto?: string
  sr?: string
  en?: string
  stop?: string
}

interface LegacySettings {
  voiceSr?: string
  voiceEn?: string
  shortcuts?: LegacyShortcuts
}

const DEFAULT_BINDINGS: LanguageBinding[] = [
  { id: 'sr', langCode: 'sr', voice: 'sr_Marko_medium', shortcut: 'CommandOrControl+Shift+S' },
  { id: 'en', langCode: 'en', voice: 'en_US-lessac-medium', shortcut: 'CommandOrControl+Shift+E' }
]

const CURRENT_SCHEMA_VERSION = 2

const DEFAULT_SETTINGS: Settings = {
  languageBindings: structuredClone(DEFAULT_BINDINGS),
  fallbackLang: 'en',
  autoShortcut: 'CommandOrControl+Shift+R',
  stopShortcut: 'CommandOrControl+Shift+Q',
  rate: 1.0,
  cleanText: true,
  stripBrackets: false,
  startHidden: true,
  maxChars: 6000,
  historyLimit: 5,
  schemaVersion: CURRENT_SCHEMA_VERSION
}

let cache: Settings = structuredClone(DEFAULT_SETTINGS)
const listeners = new Set<() => void>()

function _settingsFilePath(): string {
  return pathsService.userDataFile('settings.json')
}

/**
 * Builds the Serbian and English bindings from a legacy settings object, using
 * each stored voice / per-language shortcut when present and falling back to the
 * built-in defaults otherwise. Returns `null` when there is nothing legacy to
 * migrate, so the caller can fall back to the built-in default bindings.
 */
function _migrateLegacyBindings(params: { parsed: LegacySettings }): LanguageBinding[] | null {
  const { parsed } = params
  const hasLegacy = parsed.voiceSr ?? parsed.voiceEn ?? parsed.shortcuts
  if (!hasLegacy) {
    return null
  }
  const sc = parsed.shortcuts ?? {}
  return DEFAULT_BINDINGS.map<LanguageBinding>((binding) => {
    if (binding.langCode === 'sr') {
      return {
        id: binding.id,
        langCode: 'sr',
        voice: parsed.voiceSr ?? binding.voice,
        shortcut: sc.sr ?? binding.shortcut
      }
    }
    return {
      id: binding.id,
      langCode: 'en',
      voice: parsed.voiceEn ?? binding.voice,
      shortcut: sc.en ?? binding.shortcut
    }
  })
}

/**
 * Converts a persisted `rate` from the pre-v2 length-scale semantics (lower was
 * faster) into the v2 speed-multiplier semantics (higher is faster) by inverting
 * it (`1 / rate`). Runs only while the stored schema is older than v2; once a
 * value has been migrated it is left untouched. Returns `undefined` when no rate
 * was stored so the caller can fall back to the default. Pure and total.
 */
function _migrateLegacyRate(params: {
  rate: number | undefined
  schemaVersion: number | undefined
}): number | undefined {
  const { rate, schemaVersion } = params
  if (rate === undefined) {
    return undefined
  }
  if ((schemaVersion ?? 1) >= CURRENT_SCHEMA_VERSION) {
    return rate
  }
  if (rate > 0) {
    return 1 / rate
  }
  return 1
}

/**
 * Normalizes a parsed settings object into a complete, valid `Settings`,
 * migrating any legacy two-language fields into `languageBindings` and filling
 * every field from the defaults when missing. Pure and total.
 */
function _buildSettings(params: {
  defaults: Settings
  parsed: Partial<Settings> & LegacySettings
}): Settings {
  const { defaults, parsed } = params
  const bindings = Array.isArray(parsed.languageBindings)
    ? parsed.languageBindings
    : _migrateLegacyBindings({ parsed }) ?? defaults.languageBindings
  const autoShortcut = parsed.autoShortcut ?? parsed.shortcuts?.auto ?? defaults.autoShortcut
  const stopShortcut = parsed.stopShortcut ?? parsed.shortcuts?.stop ?? defaults.stopShortcut
  const rate = _migrateLegacyRate({ rate: parsed.rate, schemaVersion: parsed.schemaVersion }) ?? defaults.rate
  return {
    languageBindings: bindings,
    fallbackLang: parsed.fallbackLang ?? defaults.fallbackLang,
    autoShortcut,
    stopShortcut,
    rate,
    cleanText: parsed.cleanText ?? defaults.cleanText,
    stripBrackets: parsed.stripBrackets ?? defaults.stripBrackets,
    startHidden: parsed.startHidden ?? defaults.startHidden,
    maxChars: parsed.maxChars ?? defaults.maxChars,
    historyLimit: parsed.historyLimit ?? defaults.historyLimit,
    schemaVersion: CURRENT_SCHEMA_VERSION
  }
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
      const parsed = JSON.parse(raw) as Partial<Settings> & LegacySettings
      cache = _buildSettings({ defaults: DEFAULT_SETTINGS, parsed })
    } catch {
      cache = structuredClone(DEFAULT_SETTINGS)
    }
    _persistSettingsToDisk()
    return cache
  },

  get(): Settings {
    return cache
  },

  update(params: { patch: Partial<Settings> }): Settings {
    cache = { ...cache, ...params.patch }
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
