export type Lang = 'auto' | 'sr' | 'en'

export interface Shortcuts {
  auto: string
  sr: string
  en: string
  stop: string
}

export interface Settings {
  shortcuts: Shortcuts
  voiceSr: string
  voiceEn: string
  rate: number
  cleanText: boolean
  stripBrackets: boolean
  startHidden: boolean
  showTray: boolean
  maxChars: number
}

export interface Voice {
  name: string
  hasJson: boolean
  sizeBytes: number
  lang: 'sr' | 'en' | 'other'
  isDefault: boolean
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
  setDefaultVoice(lang: 'sr' | 'en', name: string): Promise<Settings>

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
