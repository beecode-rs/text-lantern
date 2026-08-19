export interface LanguageBinding {
  id: string
  langCode: string
  voice: string
  shortcut: string
}

export type Lang = 'auto' | (string & {})

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  languageBindings: LanguageBinding[]
  fallbackLang: string
  autoShortcut: string
  stopShortcut: string
  rate: number
  shouldBleepWhileLoadingModel: boolean
  shouldCleanText: boolean
  shouldStripBrackets: boolean
  shouldStartHidden: boolean
  shouldCloseToTray: boolean
  theme: ThemePreference
  maxChars: number
  historyLimit: number
  schemaVersion: number
}

export interface Voice {
  name: string
  hasJson: boolean
  sizeBytes: number
  lang: string
  isInUse: boolean
}

export interface RemoteVoice {
  name: string
  lang: string
  quality: string
  sizeBytes: number
}

export type VoiceDownloadState = 'downloading' | 'done' | 'error'

export interface VoiceDownload {
  progress: number
  state: VoiceDownloadState
}

export type TtsStatus =
  | { state: 'idle' }
  | { state: 'synthesizing'; voice: string }
  | { state: 'reading'; voice: string }
  | { state: 'error'; error: string }

export interface HistoryEntry {
  id: string
  text: string
  voice: string
  createdAt: number
}

export interface TtsSpeakOptions {
  shouldSkipHistory?: boolean
}

export interface ConfigBackup {
  app: string
  schemaVersion: number
  exportedAt: number
  settings: Settings
  voices: string[]
}

export interface ConfigImportResult {
  didSucceed: boolean
  didCancel: boolean
  failedVoices: string[]
  errorMessage: string | null
}

export interface TtsApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  listVoices(): Promise<Voice[]>
  isEngineInstalled(): Promise<boolean>
  installEngine(voiceNames: string[]): Promise<boolean>
  downloadVoice(name: string): Promise<Voice[]>
  deleteVoice(name: string): Promise<Voice[]>
  searchVoices(query: string): Promise<RemoteVoice[]>

  speak(lang: Lang, text?: string, options?: TtsSpeakOptions): Promise<boolean>
  stop(): Promise<boolean>
  playbackEnded(): Promise<boolean>

  reregisterShortcuts(): Promise<boolean>
  showSettings(): Promise<void>

  exportConfig(): Promise<boolean>
  importConfig(): Promise<ConfigImportResult>

  onConfigLog(cb: (line: string) => void): () => void
  onConfigProgress(cb: (p: { name: string; progress: number }) => void): () => void

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
