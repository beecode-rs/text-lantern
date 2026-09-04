import { TtsProvider } from '#src/shared/types'

export const TTS_PROVIDER_LABEL: Record<TtsProvider, string> = {
  [TtsProvider.COSYVOICE]: 'CosyVoice',
  [TtsProvider.PIPER]: 'Piper',
  [TtsProvider.KOKORO]: 'Kokoro',
}
