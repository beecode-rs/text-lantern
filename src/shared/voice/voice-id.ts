import { TtsProvider } from '#src/shared/types'

export interface VoiceId {
  name: string
  provider: TtsProvider
}

export const voiceIdParser = {
  _providerByIdPrefix: {
    [TtsProvider.COSYVOICE]: TtsProvider.COSYVOICE,
    [TtsProvider.KOKORO]: TtsProvider.KOKORO,
    [TtsProvider.PIPER]: TtsProvider.PIPER,
  } as Record<string, TtsProvider | undefined>,
  build(params: { name: string; provider: TtsProvider }): string {
    return `${params.provider}/${params.name}`
  },
  parse(params: { id: string }): VoiceId {
    const separatorIndex = params.id.indexOf('/')
    if (separatorIndex < 0) {
      return { name: params.id, provider: TtsProvider.PIPER }
    }
    const provider = this._providerByIdPrefix[params.id.slice(0, separatorIndex)]
    if (provider === undefined) {
      return { name: params.id, provider: TtsProvider.PIPER }
    }

    return { name: params.id.slice(separatorIndex + 1), provider }
  },
}
