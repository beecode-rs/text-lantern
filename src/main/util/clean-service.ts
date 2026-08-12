function stripCodeBlocks(s: string): string {
  return s.replace(/```.*?```/gs, '')
}

function stripInlineCode(s: string): string {
  return s.replace(/`[^`\n]*`/g, '')
}

function stripImages(s: string): string {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
}

function unwrapLinks(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

function stripEmails(s: string): string {
  return s.replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, '')
}

function stripUrls(s: string): string {
  const withoutHttp = s.replace(/\bhttps?:\/\/\S+/g, '')
  const withoutWww = withoutHttp.replace(/\bwww\.\S+/g, '')
  return withoutWww.replace(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:\/\S*)?/gi, '')
}

function stripCitations(s: string): string {
  const numeric = s.replace(/\[\s*\d+(?:\s*[,–\-.]?\s*[A-Za-z0-9.]*)*\s*\]/g, '')
  return numeric.replace(
    /\[(?:citation\s+needed|edit|sic|ref|fn\s+\d+|note\s+\d+|nb\s+\d+)\]/gi,
    ''
  )
}

function stripListMarkers(s: string): string {
  return s.replace(/^[ \t]*([-*+]|\d+[.)]|#{1,6}|>)[ \t]*/gm, '')
}

function stripBracketContent(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
}

function dropBracketChars(s: string): string {
  return s.replace(/[()[\]{}]/g, '')
}

function resolveBracketStep(stripContent: boolean): (s: string) => string {
  if (stripContent) {
    return stripBracketContent
  }
  return dropBracketChars
}

function decorationToSpace(s: string): string {
  return s.replace(/[*_~|>#]/g, ' ')
}

function tidyWhitespace(s: string): string {
  const collapsed = s
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
  return collapsed.replace(/\n{3,}/g, '\n\n')
}

export const cleanService = {
  cleanText(params: { input: string; stripBrackets?: boolean }): string {
    const { input, stripBrackets = false } = params
    const steps = [
      stripCodeBlocks,
      stripInlineCode,
      stripImages,
      unwrapLinks,
      stripHtmlTags,
      stripEmails,
      stripUrls,
      stripCitations,
      stripListMarkers,
      resolveBracketStep(stripBrackets),
      decorationToSpace,
      tidyWhitespace
    ]
    return steps
      .reduce((acc, step) => {
        return step(acc)
      }, input)
      .trim()
  }
}
