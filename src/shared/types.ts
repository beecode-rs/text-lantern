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
  grammarShortcut: string
  grammarLlmProvider: LlmProviderId
  grammarLlmBaseUrl: string
  grammarLlmApiKey: string
  grammarLlmModel: string
  shouldFixSerbianDiacritics: boolean
  grammarPromptEn: string
  grammarPromptSr: string
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
  schemaVersion: number
}

export enum TtsProvider {
  KOKORO = 'KOKORO',
  PIPER = 'PIPER',
}

export enum LlmProvider {
  ANTHROPIC = 'ANTHROPIC',
  OLLAMA = 'OLLAMA',
}

export type LlmProviderId = LlmProvider

export interface LlmModel {
  id: string
  name: string
}

export interface Voice {
  name: string
  hasJson: boolean
  sizeBytes: number
  lang: string
  isInUse: boolean
  provider: TtsProvider
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

export enum MacPermission {
  ACCESSIBILITY = 'ACCESSIBILITY',
  AUTOMATION = 'AUTOMATION',
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
  | { state: TtsState.ERROR; error: string; missingMacPermissions?: MacPermission[] }

export interface GrammarIssue {
  explanation: string
  isIgnored: boolean
  /**
   * Start offset of this issue's span in `correctedText`: the `suggestion` text while applied,
   * the `original` text while ignored. Null when the span cannot be located, which makes the
   * issue non-reversible in the UI.
   */
  location: number | null
  original: string
  suggestion: string
}

export interface GrammarCheckResult {
  langCode: string
  correctedText: string
  issues: GrammarIssue[]
  model: string
  provider: LlmProvider
}

export enum GrammarCheckState {
  IDLE = 'IDLE',
  GRABBING = 'GRABBING',
  CHECKING = 'CHECKING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export type GrammarCheckStatus =
  | { state: GrammarCheckState.IDLE }
  | { state: GrammarCheckState.GRABBING }
  | { state: GrammarCheckState.CHECKING; model: string }
  | { state: GrammarCheckState.DONE; result: GrammarCheckResult }
  | { state: GrammarCheckState.ERROR; error: string }

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
  settings: Omit<Settings, 'grammarLlmApiKey'>
  voices: string[]
}

export interface ConfigImportResult {
  didSucceed: boolean
  didCancel: boolean
  failedVoices: string[]
  errorMessage: string | null
}

export type UpdateCheckState = 'idle' | 'checking' | 'upToDate' | 'updateAvailable' | 'error'

export enum UpdateErrorKind {
  HTTP_ERROR = 'HTTP_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  NETWORK = 'NETWORK',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface UpdateAsset {
  name: string
  sizeBytes: number
  url: string
}

export interface UpdateCheckError {
  kind: UpdateErrorKind
  message: string | null
  rateLimitResetAt: number | null
  statusCode: number | null
}

export type UpdateDownloadStatus = 'idle' | 'downloading' | 'installing' | 'restart-required' | 'completed' | 'error'

export interface UpdateDownloadProgress {
  errorMessage?: string
  filePath?: string
  receivedBytes: number
  state: UpdateDownloadStatus
  totalBytes: number
}

export interface UpdateDownloadResult {
  filePath: string | null
  outcome: 'installer-opened' | 'release-page' | 'restart-required'
}

export type UpdateInstallType = 'appImage' | 'deb' | 'dev' | 'dmg' | 'exe' | 'unsupported'

export interface UpdateStatus {
  asset: UpdateAsset | null
  currentVersion: string
  error: UpdateCheckError | null
  latestVersion: string | null
  releaseUrl: string
  state: UpdateCheckState
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

  getTtsStatus(): Promise<TtsStatus>
  speak(lang: Lang, text?: string, options?: TtsSpeakOptions): Promise<boolean>
  stop(): Promise<boolean>
  playbackEnded(): Promise<boolean>

  grammarCheck(): Promise<boolean>
  recheckGrammar(params?: { text?: string }): Promise<boolean>
  getGrammarStatus(): Promise<GrammarCheckStatus>
  getGrammarLastResult(): Promise<GrammarCheckResult | null>
  setGrammarIssueIgnored(params: { isIgnored: boolean; issueIndex: number }): Promise<GrammarCheckResult | null>
  listGrammarModels(): Promise<LlmModel[]>

  reregisterShortcuts(): Promise<boolean>
  showSettings(): Promise<void>
  openMacSettingsPane(pane: MacPermission): Promise<boolean>

  exportConfig(): Promise<boolean>
  importConfig(): Promise<ConfigImportResult>

  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdate(): Promise<UpdateStatus>
  downloadUpdate(): Promise<UpdateDownloadResult>
  restartUpdate(): Promise<boolean>
  onUpdateChanged(cb: (status: UpdateStatus) => void): () => void
  onDownloadChanged(cb: (progress: UpdateDownloadProgress) => void): () => void

  onConfigLog(cb: (line: string) => void): () => void
  onConfigProgress(cb: (p: { name: string; progress: number }) => void): () => void

  getHistory(): Promise<HistoryEntry[]>
  clearHistory(): Promise<boolean>
  removeHistoryEntry(id: string): Promise<boolean>

  onSettingsChanged(cb: (s: Settings) => void): () => void
  onTtsStatus(cb: (s: TtsStatus) => void): () => void
  onGrammarStatus(cb: (s: GrammarCheckStatus) => void): () => void
  onAudioStart(cb: (p: { sampleRate: number; voice: string }) => void): () => void
  onAudioChunk(cb: (samples: Uint8Array) => void): () => void
  onAudioEnd(cb: () => void): () => void
  onStopPlayback(cb: () => void): () => void
  onModelsLog(cb: (line: string) => void): () => void
  onModelsProgress(cb: (p: { id: string; name: string; progress: number }) => void): () => void
  onHistoryChanged(cb: (entries: HistoryEntry[]) => void): () => void
}
