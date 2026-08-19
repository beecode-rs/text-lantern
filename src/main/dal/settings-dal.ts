import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'

import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import { pathUtil } from '#src/main/util/path-util'
import type { LanguageBinding, Settings } from '#src/shared/types'
import { DEFAULT_ENGLISH_VOICE_NAME, DEFAULT_SERBIAN_VOICE_NAME } from '#src/shared/voice/default-voice'

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
  cleanText?: boolean
  stripBrackets?: boolean
  startHidden?: boolean
}

export class SettingsDal {
  readonly defaults: Settings

  protected _cache: Settings = structuredClone(constant().settings.defaultSettings)

  protected readonly _listeners = new Set<() => void>()

  constructor() {
    this.defaults = constant().settings.defaultSettings
  }

  init(): Settings {
    try {
      const raw = fs.readFileSync(this._settingsFilePath(), 'utf8')
      const parsed = JSON.parse(raw) as Partial<Settings> & LegacySettings
      this._cache = this._buildSettings({ defaults: constant().settings.defaultSettings, parsed })
    } catch {
      this._cache = structuredClone(constant().settings.defaultSettings)
    }
    this._persistSettingsToDisk()

    return this._cache
  }

  get(): Settings {
    return this._cache
  }

  update(params: { patch: Partial<Settings> }): Settings {
    this._cache = { ...this._cache, ...params.patch }
    this._persistSettingsToDisk()
    this._listeners.forEach((cb) => {
      cb()
    })

    return this._cache
  }

  onChange(cb: () => void): () => void {
    this._listeners.add(cb)

    return () => {
      this._listeners.delete(cb)
    }
  }

  protected _settingsFilePath(): string {
    return pathUtil.userDataFile('settings.json')
  }

  protected _migrateLegacyBindings(params: { parsed: LegacySettings }): LanguageBinding[] | null {
    const { parsed } = params
    const hasLegacy = parsed.voiceSr ?? parsed.voiceEn ?? parsed.shortcuts
    if (!hasLegacy) {
      return null
    }
    const sc = parsed.shortcuts ?? {}

    return [
      {
        id: 'sr',
        langCode: 'sr',
        shortcut: sc.sr ?? 'CommandOrControl+Shift+S',
        voice: parsed.voiceSr ?? DEFAULT_SERBIAN_VOICE_NAME,
      },
      {
        id: 'en',
        langCode: 'en',
        shortcut: sc.en ?? 'CommandOrControl+Shift+E',
        voice: parsed.voiceEn ?? DEFAULT_ENGLISH_VOICE_NAME,
      },
    ]
  }

  protected _migrateLegacyRate(params: {
    rate: number | undefined
    schemaVersion: number | undefined
  }): number | undefined {
    const { rate, schemaVersion } = params
    if (rate === undefined) {
      return undefined
    }
    if ((schemaVersion ?? 1) >= constant().settings.currentSchemaVersion) {
      return rate
    }
    if (rate > 0) {
      return 1 / rate
    }

    return 1
  }

  protected _resolveBindings(params: {
    defaults: LanguageBinding[]
    legacyBindings: LanguageBinding[] | null
    parsed: Partial<Settings> & LegacySettings
  }): LanguageBinding[] {
    if (Array.isArray(params.parsed.languageBindings)) {
      return params.parsed.languageBindings
    }

    return params.legacyBindings ?? params.defaults
  }

  protected _buildSettings(params: { defaults: Settings; parsed: Partial<Settings> & LegacySettings }): Settings {
    const { defaults, parsed } = params
    const legacyBindings = this._migrateLegacyBindings({ parsed })
    const bindings = this._resolveBindings({ defaults: defaults.languageBindings, legacyBindings, parsed })
    const autoShortcut = parsed.autoShortcut ?? parsed.shortcuts?.auto ?? defaults.autoShortcut
    const stopShortcut = parsed.stopShortcut ?? parsed.shortcuts?.stop ?? defaults.stopShortcut
    const rate = this._migrateLegacyRate({ rate: parsed.rate, schemaVersion: parsed.schemaVersion }) ?? defaults.rate
    const fallbackLang = this._resolveFallbackLang({ defaults, legacyBindings, parsed })

    return {
      autoShortcut,
      fallbackLang,
      historyLimit: parsed.historyLimit ?? defaults.historyLimit,
      languageBindings: bindings,
      maxChars: parsed.maxChars ?? defaults.maxChars,
      rate,
      schemaVersion: constant().settings.currentSchemaVersion,
      shouldBleepWhileLoadingModel: parsed.shouldBleepWhileLoadingModel ?? defaults.shouldBleepWhileLoadingModel,
      shouldCleanText: parsed.shouldCleanText ?? parsed.cleanText ?? defaults.shouldCleanText,
      shouldStartHidden: parsed.shouldStartHidden ?? parsed.startHidden ?? defaults.shouldStartHidden,
      shouldStripBrackets: parsed.shouldStripBrackets ?? parsed.stripBrackets ?? defaults.shouldStripBrackets,
      stopShortcut,
      theme: parsed.theme ?? defaults.theme,
    }
  }

  protected _resolveFallbackLang(params: {
    parsed: Partial<Settings> & LegacySettings
    legacyBindings: LanguageBinding[] | null
    defaults: Settings
  }): string {
    if (params.parsed.fallbackLang !== undefined) {
      return params.parsed.fallbackLang
    }
    if (params.legacyBindings !== null) {
      return 'en'
    }

    return params.defaults.fallbackLang
  }

  protected _persistSettingsToDisk(): void {
    try {
      fs.writeFileSync(this._settingsFilePath(), JSON.stringify(this._cache, null, 2), 'utf8')
    } catch (err) {
      logger().error('Failed to save settings:', err)
    }
  }
}

export const settingsDalSingleton = singletonPattern(() => new SettingsDal())
