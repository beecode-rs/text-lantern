import { api } from '@src/renderer/src/api'
import type { HistoryEntry } from '@src/shared/types'
import { create } from 'zustand'

interface HistoryStore {
  entries: HistoryEntry[]
  load: () => Promise<void>
  clear: () => Promise<void>
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
  replace: (entries) => {
    set({ entries })
  },
}))
