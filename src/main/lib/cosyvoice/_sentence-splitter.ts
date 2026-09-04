const SENTENCE_BOUNDARY_REGEX = /(?<=[.!?…]["')\]”’]{0,3})\s+/u

export const cosyvoiceSentenceSplitter = {
  _clean(params: { segments: string[] }): string[] {
    return params.segments
      .map((segment) => {
        return segment.trim()
      })
      .filter((segment) => {
        return segment.length > 0
      })
  },

  _lastBreakIndex(params: { maxChars: number; text: string }): number {
    const lastSpaceAt = params.text.lastIndexOf(' ', params.maxChars)
    if (lastSpaceAt > 0) {
      return lastSpaceAt
    }

    return params.maxChars
  },

  _splitOverlong(params: { maxChars: number; text: string }): string[] {
    if (params.text.length <= params.maxChars) {
      return [params.text]
    }
    const cutAt = this._lastBreakIndex({ maxChars: params.maxChars, text: params.text })
    const head = params.text.slice(0, cutAt)
    const rest = params.text.slice(cutAt)

    return [head, ...this._splitOverlong({ maxChars: params.maxChars, text: rest })]
  },

  _splitParagraphs(params: { text: string }): string[] {
    return params.text
      .split(/\n+/u)
      .map((paragraph) => {
        return paragraph.trim()
      })
      .filter((paragraph) => {
        return paragraph.length > 0
      })
  },

  _splitSentences(params: { text: string }): string[] {
    return params.text
      .split(SENTENCE_BOUNDARY_REGEX)
      .map((sentence) => {
        return sentence.trim()
      })
      .filter((sentence) => {
        return sentence.length > 0
      })
  },

  split(params: { firstMaxChars?: number; maxChars: number; text: string }): string[] {
    const segments = this._clean({
      segments: this._splitParagraphs({ text: params.text })
        .flatMap((paragraph) => {
          return this._splitSentences({ text: paragraph })
        })
        .flatMap((sentence) => {
          return this._splitOverlong({ maxChars: params.maxChars, text: sentence })
        }),
    })
    if (params.firstMaxChars === undefined || segments.length === 0) {
      return segments
    }
    const [firstSegment, ...restSegments] = segments

    return [
      ...this._clean({ segments: this._splitOverlong({ maxChars: params.firstMaxChars, text: firstSegment }) }),
      ...restSegments,
    ]
  },
}
