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
 * `listTtsLanguages()` preserves that order for selectors.
 */
const TTS_LANGUAGES_RAW = [
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
export type TtsLanguage = (typeof TTS_LANGUAGES_RAW)[number]['code']

export interface TtsLanguageInfo {
  /**
   * Any ISO 639 code for a recognized language — either one of the built-in
   * codes in the `TtsLanguage` union or a user-supplied code added at runtime
   * via the `languages` environment variable. Codes are lowercase.
   */
  code: string
  /** Human-readable name for selectors / menus. */
  name: string
}

/**
 * Reads an environment variable defensively. This module is imported from both
 * Electron's main process (Node, where `process` exists) and the renderer
 * (browser bundle, where `process` is absent and a direct `process.env` access
 * would crash). The `globalThis` indirection avoids referencing a bare
 * `process` identifier so the file typechecks under a DOM-only config too, and
 * the missing-global guard ensures env reading never throws at runtime.
 * Returns `undefined` when the variable is unset or `process` is unavailable.
 */
function readEnvVar(name: string): string | undefined {
  const globalProcess = (
    globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  ).process
  if (!globalProcess) {
    return undefined
  }
  return globalProcess.env?.[name]
}

/**
 * Parses the user-supplied `languages` env var — a JSON string encoding an
 * array of `{ code, name }` objects — into validated `TtsLanguageInfo` entries.
 * Pure and total: returns `[]` for missing/empty/non-JSON/non-array input, and
 * skips individual malformed entries silently (no throw, no per-entry warning).
 * Codes are normalized to lowercase to match the built-in list and Piper/tinyld
 * conventions; names are trimmed as-is.
 */
export function parseUserLanguages(raw: string | undefined): TtsLanguageInfo[] {
  if (!raw) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn('[languages] env var "languages" is not valid JSON; ignoring it.')
    return []
  }

  if (!Array.isArray(parsed)) {
    console.warn('[languages] env var "languages" is not a JSON array; ignoring it.')
    return []
  }

  return (parsed as unknown[]).flatMap((entry): TtsLanguageInfo[] => {
    if (entry === null || typeof entry !== 'object') {
      return []
    }
    const record = entry as Record<string, unknown>
    if (typeof record.code !== 'string' || typeof record.name !== 'string') {
      return []
    }
    const code = String(record.code).trim().toLowerCase()
    const name = String(record.name).trim()
    if (!code || !name) {
      return []
    }
    return [{ code, name }]
  })
}

/**
 * Merges a base language list with user-supplied entries. Pure: builds a fresh
 * `Map` keyed by lowercase `code`, inserting all base entries first (in order)
 * then user entries. For an existing code the user's `name` overrides the base
 * name without moving the code's position; for a new code the entry is appended
 * at the end in user order. Map insertion-order semantics guarantee no
 * duplicate codes are emitted and base display order is preserved.
 */
export function mergeLanguages(
  base: readonly TtsLanguageInfo[],
  user: readonly TtsLanguageInfo[]
): TtsLanguageInfo[] {
  const byCode = new Map<string, TtsLanguageInfo>()
  base.forEach((entry) => {
    byCode.set(entry.code, entry)
  })
  user.forEach((entry) => {
    byCode.set(entry.code, entry)
  })
  return [...byCode.values()]
}

const USER_LANGUAGES = parseUserLanguages(readEnvVar('languages'))

export const TTS_LANGUAGES: readonly TtsLanguageInfo[] = mergeLanguages(
  TTS_LANGUAGES_RAW,
  USER_LANGUAGES
)

/**
 * Returns the languages this app recognizes. Ordered for display, with the
 * app's defaults (English, Serbian) first; user-supplied languages (if any)
 * appear after the built-in set, and user names override built-in names for
 * matching codes.
 */
export function listTtsLanguages(): readonly TtsLanguageInfo[] {
  return TTS_LANGUAGES
}

/**
 * Resolves a language code to its display name. Built-in codes return their
 * human-readable name; unknown codes (e.g. a user-supplied code with no entry,
 * or a voice-name prefix) are returned unchanged so callers always get a label.
 */
export function ttsLanguageName(params: { code: string }): string {
  const match = TTS_LANGUAGES.find((language) => {
    return language.code === params.code
  })
  return match?.name ?? params.code
}
