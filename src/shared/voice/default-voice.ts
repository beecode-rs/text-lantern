export const DEFAULT_SERBIAN_VOICE_NAME = 'sr_Marko_medium'

export const DEFAULT_ENGLISH_VOICE_NAME = 'en_US-lessac-medium'

export interface DefaultVoiceOption {
  voiceName: string
  langCode: string
}

export const DEFAULT_VOICE_OPTIONS: readonly DefaultVoiceOption[] = Object.freeze([
  { langCode: 'sr', voiceName: DEFAULT_SERBIAN_VOICE_NAME },
  { langCode: 'en', voiceName: DEFAULT_ENGLISH_VOICE_NAME },
])
