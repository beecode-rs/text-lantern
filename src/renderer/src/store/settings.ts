import { api } from '@src/renderer/src/api'
import type { Settings } from '@src/shared/types'
import { create } from 'zustand'

interface SettingsStore {
  settings: Settings | null
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
  replace: (s: Settings) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  load: async () => {
    const s = await api.getSettings()
    set({ settings: s })
  },
  replace: (s) => {
    set({ settings: s })
  },
  settings: null,
  update: async (patch) => {
    const s = await api.updateSettings(patch)
    set({ settings: s })
  },
}))
