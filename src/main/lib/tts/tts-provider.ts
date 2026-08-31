import type { TtsProvider } from '#src/shared/types'

export interface TtsProviderAdapter {
  readonly provider: TtsProvider
  hasVoiceModelFiles(params: { voice: string }): boolean
  ensureReadyForVoice(params: { voice: string }): Promise<{ sampleRate: number }>
  synthesize(params: { text: string; voice: string; speed: number; onChunk: (chunk: Buffer) => void }): Promise<void>
  cancelActive(): Promise<void>
  dispose(): void
}
