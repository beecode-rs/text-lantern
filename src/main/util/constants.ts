import { LogLevel } from '@beecode/msh-logger'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import packageJson from '#packageJson' with { type: 'json' }

import { objectUtil } from '@src/main/util/object-util'
import type { Settings } from '@src/shared/types'
import {
  DEFAULT_ENGLISH_VOICE_NAME,
  DEFAULT_SERBIAN_VOICE_NAME
} from '@src/shared/voice/default-voice'

export const APP_NAME = 'Text Lantern'

export const constant = singletonPattern(() => {
  const serbianVoiceName = DEFAULT_SERBIAN_VOICE_NAME
  const englishVoiceName = DEFAULT_ENGLISH_VOICE_NAME
  const defaultHistoryEntryLimit = 5
  const currentSettingsSchemaVersion = 3
  const defaultSettings: Settings = {
    languageBindings: [],
    fallbackLang: '',
    autoShortcut: 'CommandOrControl+Shift+R',
    stopShortcut: 'CommandOrControl+Shift+Q',
    rate: 1.0,
    shouldCleanText: true,
    shouldStripBrackets: false,
    shouldStartHidden: true,
    theme: 'system',
    maxChars: 6000,
    historyLimit: defaultHistoryEntryLimit,
    schemaVersion: currentSettingsSchemaVersion
  }
  return objectUtil.deepFreeze({
    projectName: packageJson.name,
    projectVersion: packageJson.version,
    configBackup: {
      currentSchemaVersion: 1,
      appIdentifier: packageJson.name,
      defaultFileName: 'text-lantern-config.json'
    },
    history: {
      defaultEntryLimit: defaultHistoryEntryLimit
    },
    logger: {
      defaultLogLevel: LogLevel.INFO
    },
    mainWindow: {
      lightBackground: '#F5F6FA',
      darkBackground: '#12131C'
    },
    piperEngine: {
      downloadTimeoutMs: 900000,
      serbianVoiceName,
      englishVoiceName,
      serbianVoicesRepoUrl: 'https://huggingface.co/phantom9623/piper-serbian-tts/resolve/main',
      piperVoicesBaseUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/main',
      piperVoicesTreeApiUrl: 'https://huggingface.co/api/models/rhasspy/piper-voices/tree/main'
    },
    piperServer: {
      defaultSampleRateHz: 16000,
      cancelGraceMs: 800,
      startupMaxAttempts: 3,
      startupTimeoutMs: 15000,
      stderrTailChars: 2000
    },
    settings: {
      currentSchemaVersion: currentSettingsSchemaVersion,
      defaultSettings
    },
    textSelection: {
      copyTimeoutMs: 1000,
      copyPollStepMs: 10,
      permissionDeniedMarkers: ['-1743', 'not authorized', 'assistive', 'apple events', 'not allowed']
    },
    tts: {
      audioFrameBytes: 4096
    }
  })
})
