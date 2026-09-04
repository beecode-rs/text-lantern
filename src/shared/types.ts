import type { KokoroVoice } from '#src/shared/voice/kokoro-voice-catalog'

export interface LanguageBinding {
  id: string
  langCode: string
  voice: string
  shortcut: string
  shouldOverrideRate: boolean
  rateOverride: number
}

export type Lang = 'auto' | (string & {})

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  languageBindings: LanguageBinding[]
  fallbackLang: string
  autoShortcut: string
  stopShortcut: string
  rate: number
  playbackStartDelayMs: number
  shouldBleepWhileLoadingModel: boolean
  shouldCleanText: boolean
  shouldStripBrackets: boolean
  shouldStartHidden: boolean
  shouldCloseToTray: boolean
  theme: ThemePreference
  maxChars: number
  historyLimit: number
  isCosyvoiceEnabled: boolean
  isExperimentalFeaturesEnabled: boolean
  schemaVersion: number
}

export enum TtsProvider {
  COSYVOICE = 'COSYVOICE',
  KOKORO = 'KOKORO',
  PIPER = 'PIPER',
}

export interface Voice {
  name: string
  hasJson: boolean
  sizeBytes: number
  lang: string
  isInUse: boolean
  provider: TtsProvider
}

export interface CosyvoiceCreateVoiceParams {
  lang: string
  name: string
  promptText: string
}

export interface CosyvoiceModelVariant {
  fileName: string
  isDownloaded: boolean
  sizeBytes: number
}

export interface RemoteVoice {
  name: string
  lang: string
  quality: string
  sizeBytes: number
  provider: TtsProvider
}

export type VoiceDownloadState = 'downloading' | 'done' | 'error'

export interface VoiceDownload {
  progress: number
  state: VoiceDownloadState
}

export enum TtsState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  SYNTHESIZING = 'SYNTHESIZING',
  READING = 'READING',
  ERROR = 'ERROR',
}

export type TtsStatus =
  | { state: TtsState.IDLE }
  | { state: TtsState.LISTENING }
  | { state: TtsState.SYNTHESIZING; voice: string }
  | { state: TtsState.READING; voice: string }
  | { state: TtsState.ERROR; error: string }

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
  downloadVoice(id: string): Promise<Voice[]>
  downloadVoiceFromUrl(url: string): Promise<Voice[]>
  deleteVoice(id: string): Promise<Voice[]>
  searchVoices(query: string): Promise<RemoteVoice[]>
  getKokoroCatalog(): Promise<KokoroVoice[]>
  openModelsFolder(): Promise<boolean>

  isCosyvoiceSupported(): Promise<boolean>
  isCosyvoiceEngineInstalled(): Promise<boolean>
  installCosyvoiceEngine(): Promise<boolean>
  uninstallCosyvoiceEngine(): Promise<boolean>
  getCosyvoiceModelVariants(): Promise<CosyvoiceModelVariant[]>
  downloadCosyvoiceModel(fileName: string): Promise<CosyvoiceModelVariant[]>
  deleteCosyvoiceModel(fileName: string): Promise<CosyvoiceModelVariant[]>
  isCosyvoiceFrontendInstalled(): Promise<boolean>
  downloadCosyvoiceFrontend(): Promise<boolean>
  createCosyvoiceVoice(params: CosyvoiceCreateVoiceParams): Promise<Voice[]>

  getTtsStatus(): Promise<TtsStatus>
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
  removeHistoryEntry(id: string): Promise<boolean>

  onSettingsChanged(cb: (s: Settings) => void): () => void
  onTtsStatus(cb: (s: TtsStatus) => void): () => void
  onAudioStart(cb: (p: { sampleRate: number; voice: string }) => void): () => void
  onAudioChunk(cb: (samples: Uint8Array) => void): () => void
  onAudioEnd(cb: () => void): () => void
  onStopPlayback(cb: () => void): () => void
  onModelsLog(cb: (line: string) => void): () => void
  onModelsProgress(cb: (p: { id: string; name: string; progress: number }) => void): () => void
  onHistoryChanged(cb: (entries: HistoryEntry[]) => void): () => void
}
