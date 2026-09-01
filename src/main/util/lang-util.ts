import { detect } from 'tinyld'

import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { Lang, LanguageBinding, Settings } from '#src/shared/types'

const TTS_LANGUAGE_CODES = new Set<string>(
  languageCatalogSingleton()
    .list()
    .map((language) => {
      return language.code
    }),
)

export const langUtil = {
  _resolveLangCode(params: { lang: Lang; text: string }): string | null {
    if (params.lang === 'auto') {
      return this.detectLang({ text: params.text })
    }

    return params.lang
  },

  detectLang(params: { text: string }): string | null {
    const code = detect(params.text)
    if (!TTS_LANGUAGE_CODES.has(code)) {
      return null
    }

    return code
  },

  resolveVoice(params: { lang: Lang; text: string; settings: Settings }): LanguageBinding | null {
    const code = this._resolveLangCode({ lang: params.lang, text: params.text })
    const matched = params.settings.languageBindings.find((binding) => {
      return binding.langCode === code
    })
    if (matched) {
      return matched
    }
    if (params.lang === 'auto') {
      const fallback = params.settings.languageBindings.find((binding) => {
        return binding.langCode === params.settings.fallbackLang
      })
      if (fallback) {
        return fallback
      }
    }

    return params.settings.languageBindings[0] ?? null
  },

  voiceLang(params: { name: string }): string {
    const lower = params.name.toLowerCase()
    const separator = lower.search(/[-_]/)
    if (separator <= 0) {
      return lower
    }

    return lower.slice(0, separator)
  },
}
