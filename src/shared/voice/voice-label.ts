import { TtsProvider } from '#src/shared/types'
import { KOKORO_VOICE_CATALOG } from '#src/shared/voice/kokoro-voice-catalog'
import { TTS_PROVIDER_LABEL } from '#src/shared/voice/tts-provider-label'
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
    return TTS_PROVIDER_LABEL[params.provider]
  },
}
