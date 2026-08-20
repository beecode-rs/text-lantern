import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import type { HistoryEntry } from '#src/shared/types'

interface HistoryStore {
  entries: HistoryEntry[]
  load: () => Promise<void>
  clear: () => Promise<void>
  remove: (id: string) => Promise<void>
  replace: (entries: HistoryEntry[]) => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  clear: async () => {
    await api.clearHistory()
  },
  entries: [],
  load: async () => {
    const entries = await api.getHistory()
    set({ entries })
  },
  remove: async (id) => {
    await api.removeHistoryEntry(id)
  },
  replace: (entries) => {
    set({ entries })
  },
}))
