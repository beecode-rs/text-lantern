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

/**
 * The user's appearance preference. `'system'` follows the OS dark-mode setting
 * and re-evaluates live as it changes; `'light'` and `'dark'` force one look.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

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
  /** Appearance: follows the OS when `system`, otherwise forces light or dark. */
  theme: ThemePreference
  maxChars: number
  /**
   * Maximum number of readings retained in History. New entries are prepended and
   * the list is trimmed to this size; lowering it prunes the existing list. Driven
   * by `historyService`, which reads it live from the current settings.
   */
  historyLimit: number
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

/**
 * A downloadable Piper voice discovered via the HuggingFace `rhasspy/piper-voices`
 * tree listing. `name` is the exact Piper voice identifier (e.g. `en_US-lessac-medium`)
 * and plugs straight into `downloadVoice`. Size is the real `.onnx` model size in
 * bytes (resolved from the LFS pointer), not the `.onnx.json` companion.
 */
export interface RemoteVoice {
  name: string
  /** Derived 2-letter language code, e.g. `en`, `de`. */
  lang: string
  /** Piper quality tier: `low`, `medium`, or `high`. */
  quality: string
  sizeBytes: number
}

export type TtsStatus =
  | { state: 'idle' }
  | { state: 'synthesizing'; voice: string }
  | { state: 'reading'; voice: string }
  | { state: 'error'; error: string }

/**
 * A single retained reading, recorded the moment text is dispatched to the TTS
 * engine. `text` is the exact (cleaned, length-capped) string spoken; `voice` is
 * the Piper voice name; `createdAt` is the dispatch time in epoch milliseconds.
 * Kept so a reading can be replayed if anything went wrong.
 */
export interface HistoryEntry {
  id: string
  text: string
  voice: string
  createdAt: number
}

export interface TtsApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  listVoices(): Promise<Voice[]>
  engineInstalled(): Promise<boolean>
  installEngine(): Promise<boolean>
  downloadVoice(name: string): Promise<Voice[]>
  deleteVoice(name: string): Promise<Voice[]>
  /** Searches the HuggingFace `rhasspy/piper-voices` repo by language code or name. */
  searchVoices(query: string): Promise<RemoteVoice[]>

  speak(lang: Lang, text?: string): Promise<boolean>
  stop(): Promise<boolean>
  playbackEnded(): Promise<boolean>

  reregisterShortcuts(): Promise<boolean>
  showSettings(): Promise<void>

  getHistory(): Promise<HistoryEntry[]>
  clearHistory(): Promise<boolean>

  onSettingsChanged(cb: (s: Settings) => void): () => void
  onTtsStatus(cb: (s: TtsStatus) => void): () => void
  onAudioStart(cb: (p: { sampleRate: number; voice: string }) => void): () => void
  onAudioChunk(cb: (samples: Uint8Array) => void): () => void
  onAudioEnd(cb: () => void): () => void
  onStopPlayback(cb: () => void): () => void
  onModelsLog(cb: (line: string) => void): () => void
  onModelsProgress(cb: (p: { name: string; progress: number }) => void): () => void
  onHistoryChanged(cb: (entries: HistoryEntry[]) => void): () => void
}
