import { detect } from 'tinyld'

import { TTS_LANGUAGES } from '@src/shared/languages'
import type { Lang, Settings } from '@src/shared/types'

const TTS_LANGUAGE_CODES = new Set<string>(
  TTS_LANGUAGES.map((language) => {
    return language.code
  })
)

export const langService = {
  detectLang(params: { text: string }): string | null {
    const code = detect(params.text)
    if (!TTS_LANGUAGE_CODES.has(code)) {
      return null
    }
    return code
  },

  /**
   * Resolves the voice model for a speak request. For a concrete language code
   * the matching binding's voice is used; for `'auto'` the language is detected
   * from the text first. When the detected language has no binding (or
   * detection fails outright) the binding for `settings.fallbackLang` is used;
   * only when that also has no binding does it fall back to the first binding,
   * or empty string when there are no bindings at all — the caller then reports
   * the voice as missing.
   */
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

  /**
   * Derives a language code from a Piper voice-name prefix — the substring
   * before the first `_` or `-` (e.g. `sr_Marko_medium` → `sr`,
   * `en_US-lessac-medium` → `en`, `de_DE-thorsten-medium` → `de`). Names with
   * no separator are returned lowercased in full.
   */
  voiceLang(params: { name: string }): string {
    const lower = params.name.toLowerCase()
    const separator = lower.search(/[-_]/)
    if (separator <= 0) {
      return lower
    }
    return lower.slice(0, separator)
  }
}
