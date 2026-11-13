// Supplements: no grammar-service.contract.yaml exists on purpose.
// Covers: GrammarService location-based issue mapping - initial span location per issue, the
// Ignore/Undo swap at the stored location, recalculation (shifting) of other issues' locations
// after an app-driven swap, and marking an issue unrevertable when its span no longer matches
// (stale mapping). This is a Vitest fallback because contract yaml cannot express it:
// grammar-service transitively imports `electron` (`#src/main/util/constants` reads `app` during
// module evaluation, `#src/main/lib/selection` imports clipboard/systemPreferences), and contract
// mocks intercept unit calls, not module-load property reads on an npm package. `vi.mock('electron')`
// is hoisted above the imports by Vitest, keeping this test Node-runnable. Protected members are
// exposed through a test subclass; setIssueIgnored itself is exercised through the public API with
// `_lastResult` seeded directly.
import { describe, expect, it, vi } from 'vitest'

import type { GrammarCheckResult, GrammarIssue } from '#src/shared/types'

vi.mock('electron', () => ({
  app: {
    getAppPath: vi.fn((): string => '/tmp/text-lantern-test'),
    getPath: vi.fn((): string => '/tmp/text-lantern-test'),
    isPackaged: false,
  },
  clipboard: {},
  systemPreferences: {},
}))

const { GrammarService } = await import('#src/main/business/service/grammar-service')
const { LlmProvider } = await import('#src/shared/types')

class TestGrammarService extends GrammarService {
  locateIssuesForTest(params: { correctedText: string; inputText: string; issues: GrammarIssue[] }): GrammarIssue[] {
    return this._locateIssues(params)
  }

  sortIssuesByLocationForTest(params: { issues: GrammarIssue[] }): GrammarIssue[] {
    return this._sortIssuesByLocation(params)
  }

  seedLastResultForTest(result: GrammarCheckResult | null): void {
    this._lastResult = result
  }
}

const issue = (overrides: Partial<GrammarIssue> & { original: string; suggestion: string }): GrammarIssue => {
  return { explanation: '', isIgnored: false, location: null, ...overrides }
}

const resultWith = (correctedText: string, issues: GrammarIssue[]): GrammarCheckResult => {
  return { correctedText, issues, langCode: 'en', model: 'test-model', provider: LlmProvider.ANTHROPIC }
}

describe('GrammarService._locateIssues', () => {
  it('assigns each issue the first free occurrence of its suggestion in document order', () => {
    const located = new TestGrammarService().locateIssuesForTest({
      correctedText: 'The cat sat on the mat.',
      inputText: 'Teh cat sat on teh mat.',
      issues: [issue({ original: 'Teh', suggestion: 'The' }), issue({ original: 'teh', suggestion: 'the' })],
    })

    expect(located[0]?.location).toBe(0)
    expect(located[1]?.location).toBe(15)
  })

  it('gives repeated suggestions distinct occurrences instead of the same first match', () => {
    const located = new TestGrammarService().locateIssuesForTest({
      correctedText: 'the the the',
      inputText: 'teh teh teh',
      issues: [issue({ original: 'teh', suggestion: 'the' }), issue({ original: 'teh', suggestion: 'the' })],
    })

    expect(located[0]?.location).toBe(0)
    expect(located[1]?.location).toBe(4)
  })

  it('leaves location null when the suggestion is missing from the corrected text', () => {
    const located = new TestGrammarService().locateIssuesForTest({
      correctedText: 'Nothing to see here.',
      inputText: 'Nothing to see here.',
      issues: [issue({ original: 'recieve', suggestion: 'receive' })],
    })

    expect(located[0]?.location).toBeNull()
  })

  it('skips occurrences that overlap an already assigned span', () => {
    const located = new TestGrammarService().locateIssuesForTest({
      correctedText: 'abc',
      inputText: 'xbc',
      issues: [issue({ original: 'x', suggestion: 'bc' }), issue({ original: 'y', suggestion: 'abc' })],
    })

    expect(located[0]?.location).toBe(1)
    expect(located[1]?.location).toBeNull()
  })

  it('anchors a punctuation issue to the sentence the LLM actually fixed, not the first matching char', () => {
    const inputText = 'A ovo je na srpskom, da vidimo. Da li stvno može i srpski da ispravi.'
    const correctedText = 'A ovo je na srpskom, da vidimo. Da li stvarno može i srpski da ispravi?'
    const located = new TestGrammarService().locateIssuesForTest({
      correctedText,
      inputText,
      issues: [issue({ original: 'stvno', suggestion: 'stvarno' }), issue({ original: '.', suggestion: '?' })],
    })

    // the input has two dots (index 30 and 68); the LLM fixed only the second one
    expect(located[0]?.location).toBe(38)
    expect(located[1]?.location).toBe(70)
  })
})

describe('GrammarService._sortIssuesByLocation', () => {
  it('orders issues by their position in the text regardless of the LLM order', () => {
    const sorted = new TestGrammarService().sortIssuesByLocationForTest({
      issues: [
        issue({ location: 15, original: 'teh', suggestion: 'the' }),
        issue({ location: 0, original: 'Teh', suggestion: 'The' }),
        issue({ location: 7, original: 'cta', suggestion: 'cat' }),
      ],
    })

    expect(
      sorted.map((current) => {
        return current.location
      }),
    ).toEqual([0, 7, 15])
  })

  it('keeps unlocatable issues at the end in their original relative order', () => {
    const sorted = new TestGrammarService().sortIssuesByLocationForTest({
      issues: [
        issue({ location: null, original: 'first-null', suggestion: 'x' }),
        issue({ location: 5, original: 'teh', suggestion: 'the' }),
        issue({ location: null, original: 'second-null', suggestion: 'y' }),
        issue({ location: 0, original: 'Teh', suggestion: 'The' }),
      ],
    })

    expect(
      sorted.map((current) => {
        return current.original
      }),
    ).toEqual(['Teh', 'teh', 'first-null', 'second-null'])
  })
})

describe('GrammarService.setIssueIgnored', () => {
  it('swaps the span at the stored location and shifts later issue locations by the length delta', () => {
    const service = new TestGrammarService()
    service.seedLastResultForTest(
      resultWith('The cat sat on the mat.', [
        issue({ location: 0, original: 'Teh big', suggestion: 'The' }),
        issue({ location: 15, original: 'teh', suggestion: 'the' }),
      ]),
    )

    const updated = service.setIssueIgnored({ isIgnored: true, issueIndex: 0 })

    expect(updated?.correctedText).toBe('Teh big cat sat on the mat.')
    expect(updated?.issues[0]).toMatchObject({ isIgnored: true, location: 0 })
    expect(updated?.issues[1]?.location).toBe(19)
    expect(service.getLastResult()).toBe(updated)
  })

  it('shifts earlier issue locations on undo and restores the corrected text', () => {
    const service = new TestGrammarService()
    service.seedLastResultForTest(
      resultWith('Teh big cat sat on the mat.', [
        issue({ isIgnored: true, location: 0, original: 'Teh big', suggestion: 'The' }),
        issue({ location: 19, original: 'teh', suggestion: 'the' }),
      ]),
    )

    const updated = service.setIssueIgnored({ isIgnored: false, issueIndex: 0 })

    expect(updated?.correctedText).toBe('The cat sat on the mat.')
    expect(updated?.issues[0]).toMatchObject({ isIgnored: false, location: 0 })
    expect(updated?.issues[1]?.location).toBe(15)
  })

  it('keeps locations of issues before the swapped span untouched', () => {
    const service = new TestGrammarService()
    service.seedLastResultForTest(
      resultWith('The cat sat upon the mat.', [
        issue({ location: 0, original: 'Teh', suggestion: 'The' }),
        issue({ location: 12, original: 'on', suggestion: 'upon' }),
        issue({ location: 17, original: 'teh', suggestion: 'the' }),
      ]),
    )

    const updated = service.setIssueIgnored({ isIgnored: true, issueIndex: 1 })

    expect(updated?.correctedText).toBe('The cat sat on the mat.')
    expect(updated?.issues[0]?.location).toBe(0)
    expect(updated?.issues[1]).toMatchObject({ isIgnored: true, location: 12 })
    expect(updated?.issues[2]?.location).toBe(15)
  })

  it('marks the issue unrevertable when the span at its location no longer matches the text', () => {
    const service = new TestGrammarService()
    service.seedLastResultForTest(
      resultWith('The cat sat on the mat.', [
        issue({ location: 4, original: 'teh', suggestion: 'The' }), // location 4 holds 'cat', not 'The'
      ]),
    )

    const updated = service.setIssueIgnored({ isIgnored: true, issueIndex: 0 })

    expect(updated?.correctedText).toBe('The cat sat on the mat.')
    expect(updated?.issues[0]).toMatchObject({ isIgnored: false, location: null })
  })

  it('returns the result unchanged when the issue was never located', () => {
    const service = new TestGrammarService()
    const seeded = resultWith('The cat sat on the mat.', [
      issue({ location: null, original: 'teh', suggestion: 'the' }),
    ])
    service.seedLastResultForTest(seeded)

    expect(service.setIssueIgnored({ isIgnored: true, issueIndex: 0 })).toBe(seeded)
  })

  it('returns null when no result exists', () => {
    expect(new TestGrammarService().setIssueIgnored({ isIgnored: true, issueIndex: 0 })).toBeNull()
  })

  it('keeps the punctuation issue on the second sentence across a length-changing revert', () => {
    const service = new TestGrammarService()
    const inputText = 'A ovo je na srpskom, da vidimo. Da li stvno može i srpski da ispravi.'
    const correctedText = 'A ovo je na srpskom, da vidimo. Da li stvarno može i srpski da ispravi?'
    const issues = service.locateIssuesForTest({
      correctedText,
      inputText,
      issues: [issue({ original: 'stvno', suggestion: 'stvarno' }), issue({ original: '.', suggestion: '?' })],
    })
    service.seedLastResultForTest(resultWith(correctedText, issues))

    // reverting stvarno -> stvno shortens the text; the ? issue must shift earlier with it
    const reverted = service.setIssueIgnored({ isIgnored: true, issueIndex: 0 })
    expect(reverted?.correctedText).toBe('A ovo je na srpskom, da vidimo. Da li stvno može i srpski da ispravi?')
    expect(reverted?.issues[1]?.location).toBe(68)

    // ignoring the ? fix must change the end of the second sentence, never the first sentence dot
    const ignored = service.setIssueIgnored({ isIgnored: true, issueIndex: 1 })
    expect(ignored?.correctedText).toBe(inputText)
    expect(ignored?.issues[1]?.location).toBe(68)

    // re-enabling restores the ? at the end of the second sentence
    const reenabled = service.setIssueIgnored({ isIgnored: false, issueIndex: 1 })
    expect(reenabled?.correctedText).toBe('A ovo je na srpskom, da vidimo. Da li stvno može i srpski da ispravi?')
    expect(reenabled?.issues[1]?.location).toBe(68)

    // re-applying stvarno grows the text back; the ? issue shifts to its original offset
    const reapplied = service.setIssueIgnored({ isIgnored: false, issueIndex: 0 })
    expect(reapplied?.correctedText).toBe(correctedText)
    expect(reapplied?.issues[1]?.location).toBe(70)
  })
})
