import { detect } from 'tinyld'

import { languageServiceSingleton } from '@src/shared/language/language-service'
import type { Lang, Settings } from '@src/shared/types'

const TTS_LANGUAGE_CODES = new Set<string>(
  languageServiceSingleton().list().map((language) => {
    return language.code
  })
)

export const langUtil = {
  detectLang(params: { text: string }): string | null {
    const code = detect(params.text)
    if (!TTS_LANGUAGE_CODES.has(code)) {
      return null
    }
    return code
  },

  resolveVoice(params: { lang: Lang; text: string; settings: Settings }): string {
    const code = params.lang === 'auto' ? this.detectLang({ text: params.text }) : params.lang
    const matched = params.settings.languageBindings.find((binding) => {
      return binding.langCode === code
    })
    if (matched) {
      return matched.voice
    }
    if (params.lang === 'auto') {
      const fallback = params.settings.languageBindings.find((binding) => {
        return binding.langCode === params.settings.fallbackLang
      })
      if (fallback) {
        return fallback.voice
      }
    }
    return params.settings.languageBindings[0]?.voice ?? ''
  },

  voiceLang(params: { name: string }): string {
    const lower = params.name.toLowerCase()
    const separator = lower.search(/[-_]/)
    if (separator <= 0) {
      return lower
    }
    return lower.slice(0, separator)
  }
}
