import { LogLevel } from '@beecode/msh-logger'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { app } from 'electron'

import packageJson from '#packageJson' with { type: 'json' }
import { objectUtil } from '#src/main/util/object-util'
import type { Settings } from '#src/shared/types'
import { DEFAULT_ENGLISH_VOICE_NAME, DEFAULT_SERBIAN_VOICE_NAME } from '#src/shared/voice/default-voice'

export const APP_NAME = 'Text Lantern'

function appDisplayName(): string {
  if (app.isPackaged) {
    return APP_NAME
  }

  return `${APP_NAME} (dev)`
}

export const APP_DISPLAY_NAME = appDisplayName()

export const constant = singletonPattern(() => {
  const serbianVoiceName = DEFAULT_SERBIAN_VOICE_NAME
  const englishVoiceName = DEFAULT_ENGLISH_VOICE_NAME
  const defaultHistoryEntryLimit = 5
  const currentSettingsSchemaVersion = 4
  const defaultSettings: Settings = {
    autoShortcut: 'CommandOrControl+Shift+R',
    fallbackLang: '',
    historyLimit: defaultHistoryEntryLimit,
    languageBindings: [],
    maxChars: 6000,
    playbackStartDelayMs: 500,
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
    kokoroEngine: {
      downloadTimeoutMs: 900000,
      markerFileSuffix: '.installed',
      modelBaseUrl: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main',
      modelFiles: [
        { path: 'config.json', sizeBytes: 44 },
        { path: 'tokenizer.json', sizeBytes: 3497 },
        { path: 'tokenizer_config.json', sizeBytes: 113 },
        { path: 'onnx/model_quantized.onnx', sizeBytes: 92361116 },
      ],
    },
    logger: {
      defaultLogLevel: LogLevel.INFO,
    },
    macPermissions: {
      accessibilitySettingsUrl:
        'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Accessibility',
      automationSettingsUrl:
        'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Automation',
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
      searchMaxLanguageCount: 3,
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
    update: {
      checkTimeoutMs: 10000,
      latestReleaseApiUrl: 'https://api.github.com/repos/beecode-rs/text-lantern/releases/latest',
    },
  })
})
