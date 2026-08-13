/**
 * A user-configurable language binding: one recognized language paired with
 * the voice model that reads it and the global shortcut that triggers reading.
 * The set of these (`Settings.languageBindings`) is the single source of truth
 * for the language → voice → shortcut mapping; the older hardcoded Serbian /
 * English fields have been folded into two default bindings.
 */
export interface LanguageBinding {
  /** Stable id decoupled from `langCode`, so the language can be re-chosen without losing identity. */
  id: string
  /** Recognized language code (matches a `TtsLanguageInfo.code`), e.g. `sr`, `en`, `de`. */
  langCode: string
  /** Voice model name that reads this language, e.g. `sr_Marko_medium`. */
  voice: string
  /** Global accelerator, e.g. `CommandOrControl+Shift+S`; empty string means no shortcut. */
  shortcut: string
}

/**
 * The target of a speak request. `'auto'` detects the language from the text
 * and resolves the matching binding's voice; any other value is a concrete
 * language code that must match a binding's `langCode`.
 */
export type Lang = 'auto' | string

export interface Settings {
  languageBindings: LanguageBinding[]
  /**
   * Language code used when auto-detection fails or yields a language with no
   * binding (e.g. too-short, ambiguous, or unsupported text). References a
   * binding's `langCode`; because it must point at a bound language, the
   * auto-detect shortcut cannot be configured without at least one binding.
   */
  fallbackLang: string
  /** Shortcut for auto-detect reading (not tied to a single language). */
  autoShortcut: string
  /** Shortcut that stops any active reading. */
  stopShortcut: string
  /**
   * Reading-speed multiplier passed to the engine: `2.0` reads twice as fast,
   * `1.0` is normal, `0.5` is half speed. Internally inverted to Piper's
   * `--length-scale` (`1 / rate`).
   */
  rate: number
  cleanText: boolean
  stripBrackets: boolean
  startHidden: boolean
  maxChars: number
  /**
   * Monotonic settings-schema version. Bumped whenever a persisted field changes
   * meaning; `settingsService.init` runs the matching one-time migration when a
   * stored file is older than the current version.
   */
  schemaVersion: number
}

export interface Voice {
  name: string
  hasJson: boolean
  sizeBytes: number
  /** Language code derived from the voice-name prefix, e.g. `sr`, `en`, `de`. */
  lang: string
  /** True when at least one language binding uses this voice. */
  inUse: boolean
}

export type TtsStatus =
  | { state: 'idle' }
  | { state: 'synthesizing'; voice: string }
  | { state: 'reading'; voice: string }
  | { state: 'error'; error: string }

export interface TtsApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  listVoices(): Promise<Voice[]>
  engineInstalled(): Promise<boolean>
  installEngine(): Promise<boolean>
  downloadVoice(name: string): Promise<Voice[]>
  deleteVoice(name: string): Promise<Voice[]>

  speak(lang: Lang, text?: string): Promise<boolean>
  stop(): Promise<boolean>
  playbackEnded(): Promise<boolean>
  loadWav(path: string): Promise<ArrayBuffer>

  reregisterShortcuts(): Promise<boolean>
  showSettings(): Promise<void>

  onSettingsChanged(cb: (s: Settings) => void): () => void
  onTtsStatus(cb: (s: TtsStatus) => void): () => void
  onPlayWav(cb: (path: string) => void): () => void
  onStopPlayback(cb: () => void): () => void
  onModelsLog(cb: (line: string) => void): () => void
  onModelsProgress(cb: (p: { name: string; progress: number }) => void): () => void
}
