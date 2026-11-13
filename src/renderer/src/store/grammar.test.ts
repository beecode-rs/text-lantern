// Supplements: no *.contract.yaml exists for this module on purpose.
// Covers: GrammarStore.setIssueIgnored must update BOTH `result` and `status`, because the grammar
// review page renders issue cards and the corrected text from `status.result`. This is a Vitest
// fallback because contract yaml cannot express it: the store imports `#src/renderer/src/api`,
// which reads `window.api` (absent outside Electron), so the module must be mocked with vi.mock,
// which contract mocks cannot do. Regression test: updating only `result` made the Ignore button
// appear to do nothing when no `grammar:status` push raced in alongside the invoke response.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LlmProvider } from '#src/shared/types'
import type { GrammarCheckResult, GrammarCheckStatus } from '#src/shared/types'

const setGrammarIssueIgnoredMock = vi.fn()
const pushListeners: ((payload: unknown) => void)[] = []

vi.mock('#src/renderer/src/api', () => ({
  api: {
    onGrammarStatus:
      () =>
      (cb: (payload: unknown) => void): (() => void) => {
        pushListeners.push(cb)

        return () => {}
      },
    setGrammarIssueIgnored: (params: unknown) => setGrammarIssueIgnoredMock(params),
  },
}))

const { useGrammarStore } = await import('#src/renderer/src/store/grammar')
const { GrammarCheckState } = await import('#src/shared/types')

const baseResult: GrammarCheckResult = {
  correctedText: 'This is the corrected text.',
  issues: [{ explanation: '', isIgnored: false, location: 8, original: 'teh', suggestion: 'the' }],
  langCode: 'en',
  model: 'test-model',
  provider: LlmProvider.ANTHROPIC,
}

describe('GrammarStore.setIssueIgnored', () => {
  beforeEach(() => {
    setGrammarIssueIgnoredMock.mockReset()
    pushListeners.length = 0
    useGrammarStore.setState({
      result: baseResult,
      status: { result: baseResult, state: GrammarCheckState.DONE },
    })
  })

  it('updates status.result so the corrected text inverts even without a status push', async () => {
    const swappedResult = {
      ...baseResult,
      correctedText: 'This is teh corrected text.',
      issues: [{ ...baseResult.issues[0], isIgnored: true }],
    }
    setGrammarIssueIgnoredMock.mockReturnValue(Promise.resolve(swappedResult))

    await useGrammarStore.getState().setIssueIgnored({ isIgnored: true, issueIndex: 0 })

    const state = useGrammarStore.getState()
    expect(state.result).toEqual(swappedResult)
    expect(state.status).toEqual({ result: swappedResult, state: GrammarCheckState.DONE })
    expect(state.status.state).toBe(GrammarCheckState.DONE)
  })

  it('keeps state untouched when there is no result yet', async () => {
    setGrammarIssueIgnoredMock.mockReturnValue(Promise.resolve(null))
    useGrammarStore.setState({ result: baseResult, status: { result: baseResult, state: GrammarCheckState.DONE } })

    await useGrammarStore.getState().setIssueIgnored({ isIgnored: true, issueIndex: 0 })

    const state = useGrammarStore.getState()
    expect(state.result).toEqual(baseResult)
    expect(state.status).toEqual({ result: baseResult, state: GrammarCheckState.DONE })
  })

  it('also recovers when the status push arrives before the invoke response resolves', async () => {
    const swappedResult = {
      ...baseResult,
      correctedText: 'This is teh corrected text.',
      issues: [{ ...baseResult.issues[0], isIgnored: true }],
    }
    setGrammarIssueIgnoredMock.mockImplementation(() => {
      pushListeners.forEach((cb) => {
        cb({ result: swappedResult, state: GrammarCheckState.DONE } satisfies GrammarCheckStatus)
      })

      return Promise.resolve(swappedResult)
    })
    pushListeners.push((payload) => {
      useGrammarStore.getState().replaceStatus(payload as GrammarCheckStatus)
    })

    await useGrammarStore.getState().setIssueIgnored({ isIgnored: true, issueIndex: 0 })

    const state = useGrammarStore.getState()
    expect(state.status).toEqual({ result: swappedResult, state: GrammarCheckState.DONE })
  })
})
