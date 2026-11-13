import type { GrammarIssue } from '#src/shared/types'

export interface ParsedGrammarCheck {
  langCode: string
  correctedText: string
  issues: GrammarIssue[]
}

export const grammarResponseParser = {
  _coerceString(value: unknown): string {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    return ''
  },
  _extractJsonObject(text: string): string {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) {
      throw new Error('Grammar check response does not contain a JSON object')
    }

    return text.slice(start, end + 1)
  },
  _hasText(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false
    }

    return value !== ''
  },
  _isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  },
  _looksTruncated(params: { withoutFences: string }): boolean {
    // The prompt mandates a JSON-only response, so a response that does not end with '}' was cut
    // off mid-stream (typically by an output token limit) rather than merely being malformed.
    return !params.withoutFences.trimEnd().endsWith('}')
  },
  _normalizeIssues(value: unknown): GrammarIssue[] {
    if (!Array.isArray(value)) {
      return []
    }

    return value
      .filter((issue): issue is Record<string, unknown> => {
        return this._isRecord(issue) && this._hasText(issue.original) && this._hasText(issue.suggestion)
      })
      .map((issue) => {
        return {
          explanation: this._coerceString(issue.explanation),
          isIgnored: false,
          location: null,
          original: this._coerceString(issue.original),
          suggestion: this._coerceString(issue.suggestion),
        }
      })
  },
  _normalizeParsed(parsed: unknown): ParsedGrammarCheck {
    if (!this._isRecord(parsed)) {
      throw new Error('Grammar check response is not a JSON object')
    }

    return {
      correctedText: this._coerceString(parsed.correctedText),
      issues: this._normalizeIssues(parsed.issues),
      langCode: this._coerceString(parsed.langCode),
    }
  },
  _parseJsonText(params: { jsonText: string; withoutFences: string }): unknown {
    try {
      return JSON.parse(params.jsonText) as unknown
    } catch (_err) {
      if (this._looksTruncated({ withoutFences: params.withoutFences })) {
        throw new Error(
          'Grammar check response is cut short before the JSON object ends. The model output was probably truncated by its token limit. Try checking a shorter selection.',
        )
      }
      throw new Error(`Grammar check response is not valid JSON: ${params.jsonText.slice(0, 500)}`)
    }
  },
  _stripCodeFences(raw: string): string {
    return raw.replaceAll('```json', '').replaceAll('```', '')
  },
  parse(params: { raw: string }): ParsedGrammarCheck {
    const { raw } = params
    const withoutFences = this._stripCodeFences(raw)
    const jsonText = this._extractJsonObject(withoutFences)
    const parsed = this._parseJsonText({ jsonText, withoutFences })

    return this._normalizeParsed(parsed)
  },
}
