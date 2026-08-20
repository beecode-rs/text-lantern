import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { LANGUAGES_RAW, type LanguageInfo } from '#src/shared/language/languages-raw'

const EXACT_MATCH_SCORE = 90

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

  match(params: { limit: number; query: string }): LanguageInfo[] {
    const query = params.query.trim().toLowerCase()
    if (!query) {
      return []
    }
    const ranked = this._languages
      .map((language) => {
        return { language, score: this._matchScore({ language, query }) }
      })
      .filter((entry) => {
        return entry.score > 0
      })
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score
        }

        return a.language.name.localeCompare(b.language.name)
      })
    const limit = this._resolveMatchLimit({
      hasExactMatch: (ranked[0]?.score ?? 0) >= EXACT_MATCH_SCORE,
      limit: params.limit,
    })

    return ranked.slice(0, limit).map((entry) => {
      return entry.language
    })
  }

  protected _readEnvVar(params: { name: string }): string | undefined {
    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    if (!globalProcess) {
      return undefined
    }

    return globalProcess.env?.[params.name]
  }

  protected _resolveMatchLimit(params: { hasExactMatch: boolean; limit: number }): number {
    if (params.hasExactMatch) {
      return 1
    }

    return params.limit
  }

  protected _matchScore(params: { language: LanguageInfo; query: string }): number {
    const name = params.language.name.toLowerCase()
    const { query } = params
    if (params.language.code === query) {
      return 100
    }
    if (name === query) {
      return 90
    }
    if (name.startsWith(query)) {
      return 80
    }
    if (name.includes(query)) {
      return 60
    }
    if (query.length >= 2 && params.language.code.includes(query)) {
      return 50
    }
    const typoScore = this._typoMatchScore({ name, query })
    if (typoScore > 0) {
      return typoScore
    }
    if (query.length >= 3 && this._isSubsequence({ query, target: name })) {
      return 20
    }

    return 0
  }

  protected _typoMatchScore(params: { name: string; query: string }): number {
    const { name, query } = params
    if (query.length < 4) {
      return 0
    }
    const maxDistance = Math.max(1, Math.floor(query.length / 3))
    const distance = this._levenshteinDistance({ a: query, b: name })
    if (distance > maxDistance) {
      return 0
    }

    return 40 - distance * 10
  }

  protected _isSubsequence(params: { query: string; target: string }): boolean {
    const targetChars = Array.from(params.target)

    return (
      Array.from(params.query).reduce<{ searchFrom: number }>(
        (acc, char) => {
          if (acc.searchFrom < 0) {
            return acc
          }
          const index = targetChars.indexOf(char, acc.searchFrom)
          if (index < 0) {
            return { searchFrom: -1 }
          }

          return { searchFrom: index + 1 }
        },
        { searchFrom: 0 },
      ).searchFrom >= 0
    )
  }

  protected _levenshteinDistance(params: { a: string; b: string }): number {
    const aChars = Array.from(params.a)
    const bChars = Array.from(params.b)
    if (aChars.length === 0) {
      return bChars.length
    }
    if (bChars.length === 0) {
      return aChars.length
    }
    const initialRow = bChars.reduce<number[]>(
      (row, _bChar, index) => {
        return [...row, index + 1]
      },
      [0],
    )
    const finalRow = aChars.reduce<number[]>((previousRow, aChar, aIndex) => {
      return bChars.reduce<number[]>(
        (row, bChar, bIndex) => {
          const substitutionCost = Number(aChar !== bChar)
          const distance = Math.min(
            row[bIndex] + 1,
            previousRow[bIndex + 1] + 1,
            previousRow[bIndex] + substitutionCost,
          )

          return [...row, distance]
        },
        [aIndex + 1],
      )
    }, initialRow)

    return finalRow[finalRow.length - 1] ?? 0
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
