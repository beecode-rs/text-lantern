import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'
import path from 'node:path'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { voiceModelDalSingleton } from '#src/main/dal/voice-model-dal'
import { piperEngineSingleton } from '#src/main/lib/piper/engine'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import { pathUtil } from '#src/main/util/path-util'
import type { ConfigBackup, LanguageBinding, Settings, ThemePreference } from '#src/shared/types'

const VOICE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

type UnknownRecord = Record<string, unknown>

interface ParsedBackup {
  settings: UnknownRecord
  voices: string[]
}

export class ConfigBackupService {
  exportToFile(params: { filePath: string }): void {
    try {
      fs.writeFileSync(params.filePath, JSON.stringify(this._buildBackup(), null, 2), 'utf8')
    } catch (err) {
      logger().error('Failed to export config:', err)
      throw err
    }
  }

  async importFromFile(params: {
    filePath: string
    onLog: (line: string) => void
    onProgress: (p: { name: string; progress: number }) => void
  }): Promise<{ didSucceed: boolean; failedVoices: string[] }> {
    const backup = this._readBackupFile({ filePath: params.filePath })
    const failedVoices = await this._downloadEachMissingVoice({
      names: this._downloadNamesFromBackup({ backup }),
      onLog: params.onLog,
      onProgress: params.onProgress,
    })
    const missingReferencedVoices = this._referencedVoiceNames({ settings: backup.settings }).filter((name) => {
      return !this._hasVoiceModelFiles({ name })
    })
    if (missingReferencedVoices.length > 0) {
      params.onLog(`Import aborted — voices still missing: ${missingReferencedVoices.join(', ')}`)

      return { didSucceed: false, failedVoices }
    }
    settingsDalSingleton().update({ patch: this._settingsPatchFromBackup({ settings: backup.settings }) })
    params.onLog('Settings applied.')

    return { didSucceed: true, failedVoices }
  }

  protected _buildBackup(): ConfigBackup {
    return {
      app: constant().configBackup.appIdentifier,
      exportedAt: Date.now(),
      schemaVersion: constant().configBackup.currentSchemaVersion,
      settings: settingsDalSingleton().get(),
      voices: voiceModelDalSingleton()
        .listVoices()
        .map((voice) => {
          return voice.name
        }),
    }
  }

  protected _readBackupFile(params: { filePath: string }): ParsedBackup {
    let raw: string
    try {
      raw = fs.readFileSync(params.filePath, 'utf8')
    } catch {
      throw new Error('Could not read the selected file.')
    }

    return this._parseBackup({ raw })
  }

  protected _parseBackup(params: { raw: string }): ParsedBackup {
    const parsed = this._parseJson({ raw: params.raw })
    if (!this._isRecord(parsed)) {
      throw new Error('The selected file is not a valid backup.')
    }
    if (parsed.app !== constant().configBackup.appIdentifier) {
      throw new Error('This backup was created by a different application.')
    }
    if (!this._isNumber(parsed.schemaVersion) || parsed.schemaVersion > constant().configBackup.currentSchemaVersion) {
      throw new Error('This backup was created by a newer version of Text Lantern.')
    }
    if (!this._isRecord(parsed.settings)) {
      throw new Error('The backup contains no settings.')
    }

    return { settings: parsed.settings, voices: this._voicesFromParsed({ value: parsed.voices }) }
  }

  protected _parseJson(params: { raw: string }): unknown {
    try {
      return JSON.parse(params.raw)
    } catch {
      throw new Error('The selected file is not valid JSON.')
    }
  }

  protected _voicesFromParsed(params: { value: unknown }): string[] {
    if (!Array.isArray(params.value)) {
      throw new Error('The backup contains an invalid voice name.')
    }
    const isValid = params.value.every((name) => {
      return this._isString(name) && VOICE_NAME_PATTERN.test(name)
    })
    if (!isValid) {
      throw new Error('The backup contains an invalid voice name.')
    }

    return params.value as string[]
  }

  protected _downloadNamesFromBackup(params: { backup: ParsedBackup }): string[] {
    const referenced = this._referencedVoiceNames({ settings: params.backup.settings })

    return Array.from(new Set([...params.backup.voices, ...referenced]))
  }

  protected _referencedVoiceNames(params: { settings: UnknownRecord }): string[] {
    const bindings = this._languageBindingsFromBackup({ settings: params.settings })
    if (bindings === null) {
      return []
    }

    return bindings.map((binding) => {
      return binding.voice
    })
  }

  protected async _downloadEachMissingVoice(params: {
    names: string[]
    onLog: (line: string) => void
    onProgress: (p: { name: string; progress: number }) => void
  }): Promise<string[]> {
    const failedNames: string[] = []
    await params.names.reduce(async (acc, name) => {
      await acc
      if (this._hasVoiceModelFiles({ name })) {
        params.onLog(`  present: ${name}`)

        return
      }
      params.onLog(`Downloading ${name}…`)
      try {
        await piperEngineSingleton().downloadVoice({
          name,
          onProgress: (p) => {
            params.onProgress({ name, progress: p })
          },
        })
        params.onLog(`  done: ${name}`)
      } catch (err) {
        failedNames.push(name)
        params.onLog(`  failed: ${name}: ${String(err)}`)
      }
    }, Promise.resolve())

    return failedNames
  }

  protected _hasVoiceModelFiles(params: { name: string }): boolean {
    const onnx = path.join(pathUtil.modelsDir(), `${params.name}.onnx`)
    const json = path.join(pathUtil.modelsDir(), `${params.name}.onnx.json`)

    return fs.existsSync(onnx) && fs.existsSync(json)
  }

  protected _settingsPatchFromBackup(params: { settings: UnknownRecord }): Partial<Settings> {
    const patch: Partial<Settings> = {}
    const bindings = this._languageBindingsFromBackup({ settings: params.settings })
    if (bindings !== null) {
      patch.languageBindings = bindings
    }
    if (this._isString(params.settings.fallbackLang)) {
      patch.fallbackLang = params.settings.fallbackLang
    }
    if (this._isString(params.settings.autoShortcut)) {
      patch.autoShortcut = params.settings.autoShortcut
    }
    if (this._isString(params.settings.stopShortcut)) {
      patch.stopShortcut = params.settings.stopShortcut
    }
    if (this._isNumber(params.settings.rate)) {
      patch.rate = this._clampedRate({ rate: params.settings.rate })
    }
    if (this._isBoolean(params.settings.shouldBleepWhileLoadingModel)) {
      patch.shouldBleepWhileLoadingModel = params.settings.shouldBleepWhileLoadingModel
    }
    if (this._isBoolean(params.settings.shouldCleanText)) {
      patch.shouldCleanText = params.settings.shouldCleanText
    }
    if (this._isBoolean(params.settings.shouldCloseToTray)) {
      patch.shouldCloseToTray = params.settings.shouldCloseToTray
    }
    if (this._isBoolean(params.settings.shouldStripBrackets)) {
      patch.shouldStripBrackets = params.settings.shouldStripBrackets
    }
    if (this._isBoolean(params.settings.shouldStartHidden)) {
      patch.shouldStartHidden = params.settings.shouldStartHidden
    }
    if (this._isString(params.settings.theme)) {
      patch.theme = this._themeFromBackup({ theme: params.settings.theme })
    }
    if (this._isNumber(params.settings.maxChars)) {
      patch.maxChars = Math.max(0, Math.floor(params.settings.maxChars))
    }
    if (this._isNumber(params.settings.historyLimit)) {
      patch.historyLimit = Math.max(0, Math.floor(params.settings.historyLimit))
    }

    return patch
  }

  protected _languageBindingsFromBackup(params: { settings: UnknownRecord }): LanguageBinding[] | null {
    const bindings = params.settings.languageBindings
    if (!Array.isArray(bindings)) {
      return null
    }
    const isValid = bindings.every((binding) => {
      if (!this._isRecord(binding)) {
        return false
      }

      return (
        this._isString(binding.id) &&
        this._isString(binding.langCode) &&
        this._isString(binding.voice) &&
        this._isString(binding.shortcut)
      )
    })
    if (!isValid) {
      return null
    }

    return bindings as LanguageBinding[]
  }

  protected _clampedRate(params: { rate: number }): number {
    return Math.min(3, Math.max(0.5, params.rate))
  }

  protected _themeFromBackup(params: { theme: string }): ThemePreference {
    if (params.theme === 'light') {
      return 'light'
    }
    if (params.theme === 'dark') {
      return 'dark'
    }

    return 'system'
  }

  protected _isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  protected _isString(value: unknown): value is string {
    return typeof value === 'string'
  }

  protected _isNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value)
  }

  protected _isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean'
  }
}

export const configBackupServiceSingleton = singletonPattern(() => {
  return new ConfigBackupService()
})
