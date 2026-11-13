import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import { type GrammarCheckResult, GrammarCheckState, type GrammarCheckStatus } from '#src/shared/types'

interface GrammarStore {
  status: GrammarCheckStatus
  result: GrammarCheckResult | null
  checkNow: () => Promise<void>
  init: () => void
  load: () => Promise<void>
  recheck: (params?: { text?: string }) => Promise<void>
  replaceStatus: (status: GrammarCheckStatus) => void
  setIssueIgnored: (params: { isIgnored: boolean; issueIndex: number }) => Promise<void>
}

let hasReceivedStatusPush = false

let unsubscribeFromStatus: (() => void) | null = null

export const useGrammarStore = create<GrammarStore>((set, get) => ({
  checkNow: async () => {
    await api.grammarCheck()
  },
  init: () => {
    if (unsubscribeFromStatus !== null) {
      return
    }
    unsubscribeFromStatus = api.onGrammarStatus(get().replaceStatus)
    void get().load()
  },
  load: async () => {
    const [status, result] = await Promise.all([api.getGrammarStatus(), api.getGrammarLastResult()])
    if (hasReceivedStatusPush) {
      return
    }
    set({ result, status })
  },
  recheck: async (params) => {
    set({ status: { model: get().result?.model ?? '', state: GrammarCheckState.CHECKING } })
    await api.recheckGrammar(params)
  },
  replaceStatus: (status) => {
    hasReceivedStatusPush = true
    if (status.state === GrammarCheckState.DONE) {
      set({ result: status.result, status })

      return
    }

    set({ status })
  },
  result: null,
  setIssueIgnored: async (params) => {
    const result = await api.setGrammarIssueIgnored(params)
    if (result !== null) {
      // The review page renders issues and corrected text from `status.result`, so both slices
      // must move together; updating only `result` leaves the UI visually unchanged.
      set({ result, status: { result, state: GrammarCheckState.DONE } })
    }
  },
  status: { state: GrammarCheckState.IDLE },
}))
