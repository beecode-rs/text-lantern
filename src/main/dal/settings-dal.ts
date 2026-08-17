import fs from 'node:fs'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { constant } from '@src/main/util/constants'
import { logger } from '@src/main/util/logger'
import { pathUtil } from '@src/main/util/path-util'
import type { LanguageBinding, Settings } from '@src/shared/types'
import {
  DEFAULT_ENGLISH_VOICE_NAME,
  DEFAULT_SERBIAN_VOICE_NAME
} from '@src/shared/voice/default-voice'

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
  public readonly defaults: Settings

  private _cache: Settings = structuredClone(constant().settings.defaultSettings)

  private readonly _listeners = new Set<() => void>()

  public constructor() {
    this.defaults = constant().settings.defaultSettings
  }

  public init(): Settings {
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

  public get(): Settings {
    return this._cache
  }

  public update(params: { patch: Partial<Settings> }): Settings {
    this._cache = { ...this._cache, ...params.patch }
    this._persistSettingsToDisk()
    this._listeners.forEach((cb) => {
      cb()
    })
    return this._cache
  }

  public onChange(cb: () => void): () => void {
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
        voice: parsed.voiceSr ?? DEFAULT_SERBIAN_VOICE_NAME,
        shortcut: sc.sr ?? 'CommandOrControl+Shift+S'
      },
      {
        id: 'en',
        langCode: 'en',
        voice: parsed.voiceEn ?? DEFAULT_ENGLISH_VOICE_NAME,
        shortcut: sc.en ?? 'CommandOrControl+Shift+E'
      }
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

  protected _buildSettings(params: {
    defaults: Settings
    parsed: Partial<Settings> & LegacySettings
  }): Settings {
    const { defaults, parsed } = params
    const legacyBindings = this._migrateLegacyBindings({ parsed })
    const bindings = Array.isArray(parsed.languageBindings)
      ? parsed.languageBindings
      : legacyBindings ?? defaults.languageBindings
    const autoShortcut = parsed.autoShortcut ?? parsed.shortcuts?.auto ?? defaults.autoShortcut
    const stopShortcut = parsed.stopShortcut ?? parsed.shortcuts?.stop ?? defaults.stopShortcut
    const rate = this._migrateLegacyRate({ rate: parsed.rate, schemaVersion: parsed.schemaVersion }) ?? defaults.rate
    const fallbackLang = this._resolveFallbackLang({ parsed, legacyBindings, defaults })
    return {
      languageBindings: bindings,
      fallbackLang,
      autoShortcut,
      stopShortcut,
      rate,
      shouldCleanText: parsed.shouldCleanText ?? parsed.cleanText ?? defaults.shouldCleanText,
      shouldStripBrackets:
        parsed.shouldStripBrackets ?? parsed.stripBrackets ?? defaults.shouldStripBrackets,
      shouldStartHidden: parsed.shouldStartHidden ?? parsed.startHidden ?? defaults.shouldStartHidden,
      theme: parsed.theme ?? defaults.theme,
      maxChars: parsed.maxChars ?? defaults.maxChars,
      historyLimit: parsed.historyLimit ?? defaults.historyLimit,
      schemaVersion: constant().settings.currentSchemaVersion
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
