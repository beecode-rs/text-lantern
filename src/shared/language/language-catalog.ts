import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { LANGUAGES_RAW, type LanguageInfo } from '#src/shared/language/languages-raw'

export class LanguageCatalog {
  protected readonly _languages: readonly LanguageInfo[]

  constructor() {
    this._languages = this._mergeLanguages({
      base: LANGUAGES_RAW,
      user: this._parseUserLanguages({ raw: this._readEnvVar({ name: 'languages' }) }),
    })
  }

  list(): readonly LanguageInfo[] {
    return this._languages
  }

  getDisplayName(params: { code: string }): string {
    const match = this._languages.find((language) => {
      return language.code === params.code
    })

    return match?.name ?? params.code
  }

  protected _readEnvVar(params: { name: string }): string | undefined {
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    if (!globalProcess) {
      return undefined
    }

    return globalProcess.env?.[params.name]
  }

  protected _parseUserLanguages(params: { raw: string | undefined }): LanguageInfo[] {
    if (!params.raw) {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(params.raw)
    } catch {
      return []
    }

    if (!Array.isArray(parsed)) {
      return []
    }

    return (parsed as unknown[]).flatMap((entry): LanguageInfo[] => {
      if (entry === null || typeof entry !== 'object') {
        return []
      }
      const record = entry as Record<string, unknown>
      if (typeof record.code !== 'string' || typeof record.name !== 'string') {
        return []
      }
      const code = record.code.trim().toLowerCase()
      const name = record.name.trim()
      if (!code || !name) {
        return []
      }

      return [{ code, name }]
    })
  }

  protected _mergeLanguages(params: { base: readonly LanguageInfo[]; user: readonly LanguageInfo[] }): LanguageInfo[] {
    const byCode = new Map<string, LanguageInfo>()
    params.base.forEach((entry) => {
      byCode.set(entry.code, entry)
    })
    params.user.forEach((entry) => {
      byCode.set(entry.code, entry)
    })

    return [...byCode.values()]
  }
}

export const languageCatalogSingleton = singletonPattern(() => new LanguageCatalog())
