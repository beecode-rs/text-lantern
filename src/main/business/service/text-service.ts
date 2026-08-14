function _stripCodeBlocks(s: string): string {
  return s.replace(/```.*?```/gs, '')
}

function _stripInlineCode(s: string): string {
  return s.replace(/`[^`\n]*`/g, '')
}

function _stripImages(s: string): string {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
}

function _unwrapLinks(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
}

function _stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

function _stripEmails(s: string): string {
  return s.replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, '')
}

function _stripUrls(s: string): string {
  const withoutHttp = s.replace(/\bhttps?:\/\/\S+/g, '')
  const withoutWww = withoutHttp.replace(/\bwww\.\S+/g, '')
  return withoutWww.replace(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:\/\S*)?/gi, '')
}

function _stripCitations(s: string): string {
  const numeric = s.replace(/\[\s*\d+(?:\s*[,–\-.]?\s*[A-Za-z0-9.]*)*\s*\]/g, '')
  return numeric.replace(
    /\[(?:citation\s+needed|edit|sic|ref|fn\s+\d+|note\s+\d+|nb\s+\d+)\]/gi,
    ''
  )
}

function _stripListMarkers(s: string): string {
  return s.replace(/^[ \t]*([-*+]|\d+[.)]|#{1,6}|>)[ \t]*/gm, '')
}

function _stripBracketContent(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
}

function _dropBracketChars(s: string): string {
  return s.replace(/[()[\]{}]/g, '')
}

function _resolveBracketStep(stripContent: boolean): (s: string) => string {
  if (stripContent) {
    return _stripBracketContent
  }
  return _dropBracketChars
}

function _decorationToSpace(s: string): string {
  return s.replace(/[*_~|>#]/g, ' ')
}

function _tidyWhitespace(s: string): string {
  const collapsed = s
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
  return collapsed.replace(/\n{3,}/g, '\n\n')
}

export const textService = {
  cleanText(params: { input: string; stripBrackets?: boolean }): string {
    const { input, stripBrackets = false } = params
    const steps = [
      _stripCodeBlocks,
      _stripInlineCode,
      _stripImages,
      _unwrapLinks,
      _stripHtmlTags,
      _stripEmails,
      _stripUrls,
      _stripCitations,
      _stripListMarkers,
      _resolveBracketStep(stripBrackets),
      _decorationToSpace,
      _tidyWhitespace
    ]
    return steps
      .reduce((acc, step) => {
        return step(acc)
      }, input)
      .trim()
  }
}
