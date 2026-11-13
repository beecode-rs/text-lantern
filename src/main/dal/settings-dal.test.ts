// Supplements: no *.contract.yaml exists for this module on purpose.
// Covers: SettingsDal._buildSettings grammar-settings defaults fill-in and survival of explicitly
// persisted grammar values. This is a Vitest fallback because contract yaml cannot express it:
// settings-dal transitively imports `electron` (`#src/main/util/constants` reads `app.isPackaged`
// during module evaluation), and contract mocks intercept unit calls, not module-load property
// reads on an npm package. `vi.mock('electron')` is hoisted above the imports by Vitest, keeping
// this test Node-runnable. The protected `_buildSettings` is exposed through a test subclass; it
// is pure given `{ defaults, parsed }`, so no file system access happens.
import { describe, expect, it, vi } from 'vitest'

import { SettingsDal } from '#src/main/dal/settings-dal'
import { LlmProvider, type Settings } from '#src/shared/types'

vi.mock('electron', () => ({
  app: {
    getAppPath: vi.fn((): string => '/tmp/text-lantern-test'),
    getPath: vi.fn((): string => '/tmp/text-lantern-test'),
    isPackaged: false,
  },
}))

const defaultSettings: Settings = {
  autoShortcut: 'CommandOrControl+Shift+R',
  fallbackLang: '',
  grammarLlmApiKey: '',
  grammarLlmBaseUrl: '',
  grammarLlmModel: '',
  grammarLlmProvider: LlmProvider.ANTHROPIC,
  grammarPromptEn: '',
  grammarPromptSr: '',
  grammarShortcut: 'CommandOrControl+Shift+G',
  historyLimit: 5,
  languageBindings: [],
  maxChars: 6000,
  playbackStartDelayMs: 500,
  rate: 1.0,
  schemaVersion: 4,
  shouldBleepWhileLoadingModel: true,
  shouldCleanText: true,
  shouldCloseToTray: false,
  shouldFixSerbianDiacritics: true,
  shouldStartHidden: true,
  shouldStripBrackets: false,
  stopShortcut: 'CommandOrControl+Shift+Q',
  theme: 'system',
}

// A settings.json written before the grammar feature existed (schemaVersion 4, old fields only).
const legacyParsed: Partial<Settings> = {
  autoShortcut: 'CommandOrControl+Shift+R',
  fallbackLang: 'en',
  historyLimit: 10,
  languageBindings: [],
  maxChars: 1234,
  playbackStartDelayMs: 300,
  rate: 1.5,
  schemaVersion: 4,
  shouldBleepWhileLoadingModel: false,
  shouldCleanText: true,
  shouldCloseToTray: true,
  shouldStartHidden: false,
  shouldStripBrackets: true,
  stopShortcut: 'CommandOrControl+Shift+S',
  theme: 'dark',
}

class TestSettingsDal extends SettingsDal {
  buildSettingsForTest(params: { defaults: Settings; parsed: Partial<Settings> }): Settings {
    return this._buildSettings(params)
  }
}

describe('SettingsDal._buildSettings grammar settings', () => {
  it('fills the grammar defaults when the persisted settings have no grammar fields', () => {
    const built = new TestSettingsDal().buildSettingsForTest({ defaults: defaultSettings, parsed: legacyParsed })

    expect(built.grammarShortcut).toBe('CommandOrControl+Shift+G')
    expect(built.grammarLlmProvider).toBe(LlmProvider.ANTHROPIC)
    expect(built.grammarLlmBaseUrl).toBe('')
    expect(built.grammarLlmApiKey).toBe('')
    expect(built.grammarLlmModel).toBe('')
    expect(built.shouldFixSerbianDiacritics).toBe(true)
    expect(built.grammarPromptEn).toBe('')
    expect(built.grammarPromptSr).toBe('')

    // non-grammar persisted values survive the merge
    expect(built.maxChars).toBe(1234)
    expect(built.theme).toBe('dark')
    expect(built.rate).toBe(1.5)
    expect(built.schemaVersion).toBe(4)
  })

  it('keeps explicitly persisted grammar values over the defaults', () => {
    const parsed: Partial<Settings> = {
      ...legacyParsed,
      grammarLlmApiKey: 'sk-test-key',
      grammarLlmBaseUrl: 'http://localhost:11434',
      grammarLlmModel: 'llama3',
      grammarLlmProvider: LlmProvider.OLLAMA,
      grammarPromptEn: 'EN override prompt',
      grammarPromptSr: 'SR override prompt',
      grammarShortcut: 'Alt+G',
      shouldFixSerbianDiacritics: false,
    }
    const built = new TestSettingsDal().buildSettingsForTest({ defaults: defaultSettings, parsed })

    expect(built.grammarShortcut).toBe('Alt+G')
    expect(built.grammarLlmProvider).toBe(LlmProvider.OLLAMA)
    expect(built.grammarLlmBaseUrl).toBe('http://localhost:11434')
    expect(built.grammarLlmApiKey).toBe('sk-test-key')
    expect(built.grammarLlmModel).toBe('llama3')
    expect(built.shouldFixSerbianDiacritics).toBe(false)
    expect(built.grammarPromptEn).toBe('EN override prompt')
    expect(built.grammarPromptSr).toBe('SR override prompt')
  })

  it('falls back to the default provider when the persisted provider string is invalid', () => {
    const parsed: Partial<Settings> = {
      ...legacyParsed,
      grammarLlmProvider: 'GEMINI' as unknown as LlmProvider,
    }
    const built = new TestSettingsDal().buildSettingsForTest({ defaults: defaultSettings, parsed })

    expect(built.grammarLlmProvider).toBe(LlmProvider.ANTHROPIC)
  })
})
