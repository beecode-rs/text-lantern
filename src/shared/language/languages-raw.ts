/**
 * Languages this app recognizes, aligned with the set the `tinyld` language
 * detector can identify. String values are the codes `tinyld`'s `detect()`
 * returns: ISO 639-1 where one exists (e.g. `en`, `sr`, `de`), otherwise the
 * ISO 639-3 code (`ber`, `tlh`).
 *
 * Not every language here has a downloadable Piper voice model — voice
 * availability is resolved at runtime from installed/downloaded voices
 * (see `models-service`). This list drives language recognition and
 * auto-detection rather than guaranteeing a voice for each entry.
 *
 * Declared in display order, app defaults (English, Serbian) first;
 * `languageServiceSingleton().list()` preserves that order for selectors.
 */
export const LANGUAGES_RAW = [
  { code: 'en', name: 'English' },
  { code: 'sr', name: 'Serbian' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ber', name: 'Berber' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'my', name: 'Burmese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'et', name: 'Estonian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rn', name: 'Kirundi' },
  { code: 'tlh', name: 'Klingon' },
  { code: 'ko', name: 'Korean' },
  { code: 'la', name: 'Latin' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'es', name: 'Spanish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'vo', name: 'Volapük' },
  { code: 'yi', name: 'Yiddish' }
] as const

/** Code returned by `tinyld`'s `detect()` for a recognized language (matches the Piper voice-name prefix). */
export type Language = (typeof LANGUAGES_RAW)[number]['code']

export interface LanguageInfo {
  /**
   * Any ISO 639 code for a recognized language — either one of the built-in
   * codes in the `Language` union or a user-supplied code added at runtime
   * via the `languages` environment variable. Codes are lowercase.
   */
  code: string
  /** Human-readable name for selectors / menus. */
  name: string
}
