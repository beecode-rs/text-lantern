import { LogLevel } from '@beecode/msh-logger'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import packageJson from '#packageJson' with { type: 'json' }
import { objectUtil } from '#src/main/util/object-util'
import type { Settings } from '#src/shared/types'
import { DEFAULT_ENGLISH_VOICE_NAME, DEFAULT_SERBIAN_VOICE_NAME } from '#src/shared/voice/default-voice'

export const APP_NAME = 'Text Lantern'

export const constant = singletonPattern(() => {
  const serbianVoiceName = DEFAULT_SERBIAN_VOICE_NAME
  const englishVoiceName = DEFAULT_ENGLISH_VOICE_NAME
  const defaultHistoryEntryLimit = 5
  const currentSettingsSchemaVersion = 3
  const defaultSettings: Settings = {
    autoShortcut: 'CommandOrControl+Shift+R',
    fallbackLang: '',
    historyLimit: defaultHistoryEntryLimit,
    languageBindings: [],
    maxChars: 6000,
    rate: 1.0,
    schemaVersion: currentSettingsSchemaVersion,
    shouldBleepWhileLoadingModel: true,
    shouldCleanText: true,
    shouldCloseToTray: false,
    shouldStartHidden: true,
    shouldStripBrackets: false,
    stopShortcut: 'CommandOrControl+Shift+Q',
    theme: 'system',
  }

  return objectUtil.deepFreeze({
    configBackup: {
      appIdentifier: packageJson.name,
      currentSchemaVersion: 1,
      defaultFileName: 'text-lantern-config.json',
    },
    history: {
      defaultEntryLimit: defaultHistoryEntryLimit,
    },
    logger: {
      defaultLogLevel: LogLevel.INFO,
    },
    mainWindow: {
      darkBackground: '#12131C',
      lightBackground: '#F5F6FA',
    },
    piperEngine: {
      downloadTimeoutMs: 900000,
      englishVoiceName,
      piperVoicesBaseUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main',
      piperVoicesTreeApiUrl: 'https://huggingface.co/api/models/rhasspy/piper-voices/tree/main',
      serbianVoiceName,
      serbianVoicesRepoUrl: 'https://huggingface.co/phantom9623/piper-serbian-tts/resolve/main',
    },
    piperServer: {
      cancelGraceMs: 800,
      defaultSampleRateHz: 16000,
      startupMaxAttempts: 3,
      startupTimeoutMs: 15000,
      stderrTailChars: 2000,
    },
    projectName: packageJson.name,
    projectVersion: packageJson.version,
    settings: {
      currentSchemaVersion: currentSettingsSchemaVersion,
      defaultSettings,
    },
    textSelection: {
      copyPollStepMs: 10,
      copyTimeoutMs: 1000,
      permissionDeniedMarkers: ['-1743', 'not authorized', 'assistive', 'apple events', 'not allowed'],
    },
    tts: {
      audioFrameBytes: 4096,
    },
  })
})
