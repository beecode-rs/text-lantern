export const DEFAULT_SERBIAN_VOICE_NAME = 'sr_Marko_medium'

export const DEFAULT_ENGLISH_VOICE_NAME = 'en_US-lessac-medium'

export interface DefaultVoiceOption {
  voiceName: string
  langCode: string
  repoName: string
  repoUrl: string
}

export const DEFAULT_VOICE_OPTIONS: readonly DefaultVoiceOption[] = Object.freeze([
  {
    langCode: 'sr',
    repoName: 'phantom9623/piper-serbian-tts',
    repoUrl: 'https://huggingface.co/phantom9623/piper-serbian-tts',
    voiceName: DEFAULT_SERBIAN_VOICE_NAME,
  },
  {
    langCode: 'en',
    repoName: 'rhasspy/piper-voices',
    repoUrl: 'https://huggingface.co/rhasspy/piper-voices',
    voiceName: DEFAULT_ENGLISH_VOICE_NAME,
  },
])
