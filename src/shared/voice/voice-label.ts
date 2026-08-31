import { TtsProvider } from '#src/shared/types'
import { KOKORO_VOICE_CATALOG } from '#src/shared/voice/kokoro-voice-catalog'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export const voiceLabelUtil = {
  _kokoroLangCode(params: { name: string }): string {
    const matched = KOKORO_VOICE_CATALOG.find((voice) => {
      return voice.id === params.name
    })
    if (matched) {
      return matched.lang
    }

    return 'en'
  },
  _providerLabels: {
    [TtsProvider.KOKORO]: 'Kokoro',
    [TtsProvider.PIPER]: 'Piper',
  } as Record<TtsProvider, string>,
  displayName(params: { id: string }): string {
    const { name, provider } = voiceIdParser.parse({ id: params.id })

    return `${name} · ${this.providerLabel({ provider })}`
  },
  langCode(params: { id: string }): string {
    const { name, provider } = voiceIdParser.parse({ id: params.id })
    if (provider === TtsProvider.KOKORO) {
      return this._kokoroLangCode({ name })
    }

    return name.split('_')[0]
  },
  providerLabel(params: { provider: TtsProvider }): string {
    return this._providerLabels[params.provider]
  },
}
