import type { Lang, Settings } from '@src/shared/types'

const SERBIAN_RE = /[Ѐ-ӿĆćČčĐđŠšŽž]/

export const langService = {
  looksLikeSerbian(params: { text: string }): boolean {
    return SERBIAN_RE.test(params.text)
  },

  resolveVoice(params: { lang: Lang; text: string; settings: Settings }): string {
    switch (params.lang) {
      case 'sr':
        return params.settings.voiceSr
      case 'en':
        return params.settings.voiceEn
      case 'auto':
      default:
        if (this.looksLikeSerbian({ text: params.text })) {
          return params.settings.voiceSr
        }
        return params.settings.voiceEn
    }
  },

  voiceLang(params: { name: string }): 'sr' | 'en' | 'other' {
    const lower = params.name.toLowerCase()
    if (lower.startsWith('sr_') || lower.startsWith('sr-')) {
      return 'sr'
    }
    if (lower.startsWith('en_') || lower.startsWith('en-')) {
      return 'en'
    }
    return 'other'
  }
}
