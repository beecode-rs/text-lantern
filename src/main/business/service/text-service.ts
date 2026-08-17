export class TextService {
  cleanText(params: { input: string; shouldStripBrackets?: boolean }): string {
    const { input, shouldStripBrackets = false } = params
    const steps = [
      this._stripCodeBlocks,
      this._stripInlineCode,
      this._stripImages,
      this._unwrapLinks,
      this._stripHtmlTags,
      this._stripEmails,
      this._stripUrls,
      this._stripCitations,
      this._stripListMarkers,
      this._resolveBracketStep(shouldStripBrackets),
      this._decorationToSpace,
      this._tidyWhitespace,
    ]

    return steps
      .reduce((acc, step) => {
        return step(acc)
      }, input)
      .trim()
  }

  protected readonly _stripCodeBlocks = (s: string): string => {
    return s.replace(/```.*?```/gs, '')
  }

  protected readonly _stripInlineCode = (s: string): string => {
    return s.replace(/`[^`\n]*`/g, '')
  }

  protected readonly _stripImages = (s: string): string => {
    return s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  }

  protected readonly _unwrapLinks = (s: string): string => {
    return s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  }

  protected readonly _stripHtmlTags = (s: string): string => {
    return s.replace(/<[^>]+>/g, '')
  }

  protected readonly _stripEmails = (s: string): string => {
    return s.replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, '')
  }

  protected readonly _stripUrls = (s: string): string => {
    const withoutHttp = s.replace(/\bhttps?:\/\/\S+/g, '')
    const withoutWww = withoutHttp.replace(/\bwww\.\S+/g, '')

    return withoutWww.replace(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:\/\S*)?/gi, '')
  }

  protected readonly _stripCitations = (s: string): string => {
    const numeric = s.replace(/\[\s*\d+(?:\s*[,–\-.]?\s*[A-Za-z0-9.]*)*\s*\]/g, '')

    return numeric.replace(/\[(?:citation\s+needed|edit|sic|ref|fn\s+\d+|note\s+\d+|nb\s+\d+)\]/gi, '')
  }

  protected readonly _stripListMarkers = (s: string): string => {
    return s.replace(/^[ \t]*([-*+]|\d+[.)]|#{1,6}|>)[ \t]*/gm, '')
  }

  protected readonly _stripBracketContent = (s: string): string => {
    return s
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\{[^}]*\}/g, '')
  }

  protected readonly _dropBracketChars = (s: string): string => {
    return s.replace(/[()[\]{}]/g, '')
  }

  protected readonly _resolveBracketStep = (shouldStripContent: boolean): ((s: string) => string) => {
    if (shouldStripContent) {
      return this._stripBracketContent
    }

    return this._dropBracketChars
  }

  protected readonly _decorationToSpace = (s: string): string => {
    return s.replace(/[*_~|>#]/g, ' ')
  }

  protected readonly _tidyWhitespace = (s: string): string => {
    const collapsed = s
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]+([.,;:!?])/g, '$1')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')

    return collapsed.replace(/\n{3,}/g, '\n\n')
  }
}
