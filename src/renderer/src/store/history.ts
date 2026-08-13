import { create } from 'zustand'
import type { HistoryEntry } from '@src/shared/types'
import { api } from '@src/renderer/src/api'

interface HistoryStore {
  entries: HistoryEntry[]
  load: () => Promise<void>
  clear: () => Promise<void>
  replace: (entries: HistoryEntry[]) => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  entries: [],
  load: async () => {
    const entries = await api.getHistory()
    set({ entries })
  },
  clear: async () => {
    await api.clearHistory()
  },
  replace: (entries) => {
    set({ entries })
  }
}))
