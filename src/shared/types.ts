export interface LanguageBinding {
  id: string
  langCode: string
  voice: string
  shortcut: string
}

export type Lang = 'auto' | string

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  languageBindings: LanguageBinding[]
  fallbackLang: string
  autoShortcut: string
  stopShortcut: string
  rate: number
  cleanText: boolean
  stripBrackets: boolean
  startHidden: boolean
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
  inUse: boolean
}

export interface RemoteVoice {
  name: string
  lang: string
  quality: string
  sizeBytes: number
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

export interface TtsApi {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>

  listVoices(): Promise<Voice[]>
  engineInstalled(): Promise<boolean>
  installEngine(): Promise<boolean>
  downloadVoice(name: string): Promise<Voice[]>
  deleteVoice(name: string): Promise<Voice[]>
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
