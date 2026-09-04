import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { voiceModelDalSingleton } from '#src/main/dal/voice-model-dal'
import { kokoroEngineSingleton } from '#src/main/lib/kokoro/engine'
import { piperEngineSingleton } from '#src/main/lib/piper/engine'
import { ttsProviderRegistrySingleton } from '#src/main/lib/tts/provider-registry'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import {
  type ConfigBackup,
  type LanguageBinding,
  type Settings,
  type ThemePreference,
  TtsProvider,
} from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

const VOICE_ID_PATTERN = /^([A-Z]+\/)?[A-Za-z0-9_-]+$/

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
      onLog: params.onLog,
      onProgress: params.onProgress,
      voiceIds: this._downloadVoiceIdsFromBackup({ backup }),
    })
    const missingReferencedVoiceIds = this._referencedVoiceIds({ settings: backup.settings })
      .filter((voiceId) => {
        return voiceIdParser.parse({ id: voiceId }).provider !== TtsProvider.COSYVOICE
      })
      .filter((voiceId) => {
        return !this._isVoiceDownloaded({ voiceId })
      })
    if (missingReferencedVoiceIds.length > 0) {
      params.onLog(`Import aborted — voices still missing: ${missingReferencedVoiceIds.join(', ')}`)

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
          return voiceIdParser.build({ name: voice.name, provider: voice.provider })
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
      throw new Error('The backup contains an invalid voice id.')
    }
    const isValid = params.value.every((voiceId) => {
      return this._isString(voiceId) && VOICE_ID_PATTERN.test(voiceId)
    })
    if (!isValid) {
      throw new Error('The backup contains an invalid voice id.')
    }

    return params.value as string[]
  }

  protected _downloadVoiceIdsFromBackup(params: { backup: ParsedBackup }): string[] {
    const voiceIds = params.backup.voices.map((voiceId) => {
      return this._qualifiedVoiceId({ voiceId })
    })

    return Array.from(new Set([...voiceIds, ...this._referencedVoiceIds({ settings: params.backup.settings })]))
  }

  protected _referencedVoiceIds(params: { settings: UnknownRecord }): string[] {
    const bindings = this._languageBindingsFromBackup({ settings: params.settings })
    if (bindings === null) {
      return []
    }

    return bindings.map((binding) => {
      return this._qualifiedVoiceId({ voiceId: binding.voice })
    })
  }

  protected _qualifiedVoiceId(params: { voiceId: string }): string {
    const parsed = voiceIdParser.parse({ id: params.voiceId })
    if (parsed.name.includes('/')) {
      throw new Error('The backup contains an invalid voice id.')
    }

    return voiceIdParser.build({ name: parsed.name, provider: parsed.provider })
  }

  protected async _downloadEachMissingVoice(params: {
    voiceIds: string[]
    onLog: (line: string) => void
    onProgress: (p: { name: string; progress: number }) => void
  }): Promise<string[]> {
    const failedVoiceIds: string[] = []
    await params.voiceIds.reduce(async (acc, voiceId) => {
      await acc
      if (this._isVoiceDownloaded({ voiceId })) {
        params.onLog(`  present: ${voiceId}`)

        return
      }
      params.onLog(`Downloading ${voiceId}…`)
      try {
        await this._downloadVoice({
          onLog: params.onLog,
          onProgress: (p) => {
            params.onProgress({ name: voiceId, progress: p })
          },
          voiceId,
        })
        params.onLog(`  done: ${voiceId}`)
      } catch (err) {
        failedVoiceIds.push(voiceId)
        params.onLog(`  failed: ${voiceId}: ${String(err)}`)
      }
    }, Promise.resolve())

    return failedVoiceIds
  }

  protected async _downloadVoice(params: {
    onLog: (line: string) => void
    onProgress: (p: number) => void
    voiceId: string
  }): Promise<void> {
    const parsed = voiceIdParser.parse({ id: params.voiceId })
    if (parsed.provider === TtsProvider.KOKORO) {
      await kokoroEngineSingleton().downloadVoice({ onProgress: params.onProgress, voiceId: parsed.name })

      return
    }
    if (parsed.provider === TtsProvider.COSYVOICE) {
      params.onLog(
        `  skipped: ${params.voiceId} — CosyVoice voices are created on this device and cannot be re-downloaded.`,
      )

      return
    }
    await piperEngineSingleton().downloadVoice({ name: parsed.name, onProgress: params.onProgress })
  }

  protected _isVoiceDownloaded(params: { voiceId: string }): boolean {
    const parsed = voiceIdParser.parse({ id: params.voiceId })

    return ttsProviderRegistrySingleton()
      .providerFor({ provider: parsed.provider })
      .hasVoiceModelFiles({ voice: params.voiceId })
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
    if (this._isNumber(params.settings.playbackStartDelayMs)) {
      patch.playbackStartDelayMs = Math.min(2000, Math.max(0, Math.floor(params.settings.playbackStartDelayMs)))
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

    return (bindings as LanguageBinding[]).map((binding) => {
      return this._bindingFromBackup({ binding })
    })
  }

  protected _bindingFromBackup(params: { binding: LanguageBinding }): LanguageBinding {
    return {
      ...params.binding,
      rateOverride: this._rateOverrideFromBackup({ rateOverride: params.binding.rateOverride }),
      shouldOverrideRate: this._shouldOverrideRateFromBackup({ shouldOverrideRate: params.binding.shouldOverrideRate }),
    }
  }

  protected _rateOverrideFromBackup(params: { rateOverride: unknown }): number {
    if (this._isNumber(params.rateOverride)) {
      return this._clampedRate({ rate: params.rateOverride })
    }

    return constant().settings.defaultSettings.rate
  }

  protected _shouldOverrideRateFromBackup(params: { shouldOverrideRate: unknown }): boolean {
    if (this._isBoolean(params.shouldOverrideRate)) {
      return params.shouldOverrideRate
    }

    return false
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
