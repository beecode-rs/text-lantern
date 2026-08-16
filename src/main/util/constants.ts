import { LogLevel } from '@beecode/msh-logger'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import packageJson from '#packageJson' with { type: 'json' }

import { objectUtil } from '@src/main/util/object-util'
import type { LanguageBinding, Settings } from '@src/shared/types'

export const APP_NAME = 'Text Lantern'

export const constant = singletonPattern(() => {
  const serbianVoiceName = 'sr_Marko_medium'
  const englishVoiceName = 'en_US-lessac-medium'
  const defaultHistoryEntryLimit = 5
  const currentSettingsSchemaVersion = 3
  const defaultLanguageBindings: LanguageBinding[] = [
    {
      id: 'sr',
      langCode: 'sr',
      voice: serbianVoiceName,
      shortcut: 'CommandOrControl+Shift+S'
    },
    {
      id: 'en',
      langCode: 'en',
      voice: englishVoiceName,
      shortcut: 'CommandOrControl+Shift+E'
    }
  ]
  const defaultSettings: Settings = {
    languageBindings: structuredClone(defaultLanguageBindings),
    fallbackLang: 'en',
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
      serbianVoiceName,
      englishVoiceName,
      defaultInstallVoiceNames: [serbianVoiceName, englishVoiceName],
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
      defaultLanguageBindings,
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
