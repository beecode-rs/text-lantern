export const DEFAULT_KOKORO_VOICE_ID = 'af_heart'

export interface KokoroVoice {
  accent: 'American' | 'British'
  gender: 'female' | 'male'
  id: string
  label: string
  lang: 'en'
}

export const KOKORO_VOICE_CATALOG: readonly KokoroVoice[] = Object.freeze([
  { accent: 'American', gender: 'female', id: 'af_heart', label: 'Heart', lang: 'en' },
  { accent: 'American', gender: 'female', id: 'af_bella', label: 'Bella', lang: 'en' },
  { accent: 'American', gender: 'female', id: 'af_nicole', label: 'Nicole', lang: 'en' },
  { accent: 'British', gender: 'female', id: 'bf_emma', label: 'Emma', lang: 'en' },
  { accent: 'American', gender: 'male', id: 'am_michael', label: 'Michael', lang: 'en' },
  { accent: 'American', gender: 'male', id: 'am_fenrir', label: 'Fenrir', lang: 'en' },
  { accent: 'American', gender: 'male', id: 'am_puck', label: 'Puck', lang: 'en' },
  { accent: 'British', gender: 'male', id: 'bm_george', label: 'George', lang: 'en' },
  { accent: 'British', gender: 'male', id: 'bm_fable', label: 'Fable', lang: 'en' },
])
