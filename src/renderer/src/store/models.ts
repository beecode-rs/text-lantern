import { create } from 'zustand'
import type { RemoteVoice, Voice } from '@src/shared/types'
import { api } from '@src/renderer/src/api'

interface ModelsStore {
  voices: Voice[]
  isEngineInstalled: boolean
  isInstalling: boolean
  logs: string[]
  progress: Record<string, number>
  isLoading: boolean
  remote: RemoteVoice[]
  isSearching: boolean
  searchError: string | null

  load: () => Promise<void>
  refreshEngine: () => Promise<void>
  download: (name: string) => Promise<void>
  remove: (name: string) => Promise<void>
  installEngine: () => Promise<void>
  search: (query: string) => Promise<void>
  appendLog: (line: string) => void
  setProgress: (name: string, p: number) => void
}

export const useModelsStore = create<ModelsStore>((set, get) => {
  const omit = <T extends Record<string, unknown>>(obj: T, key: string): T => {
    const next = { ...obj }
    delete next[key]
    return next
  }

  return {
    voices: [],
    isEngineInstalled: false,
    isInstalling: false,
    logs: [],
    progress: {},
    isLoading: false,
    remote: [],
    isSearching: false,
    searchError: null,

    load: async () => {
      set({ isLoading: true })
      const [voices, isEngineInstalled] = await Promise.all([api.listVoices(), api.isEngineInstalled()])
      set({ voices, isEngineInstalled, isLoading: false })
    },
    refreshEngine: async () => {
      set({ isEngineInstalled: await api.isEngineInstalled() })
    },
    download: async (name) => {
      try {
        const voices = await api.downloadVoice(name)
        set({ voices, progress: omit(get().progress, name) })
      } catch (err) {
        get().appendLog(`Download failed for ${name}: ${String(err)}`)
        set({ progress: omit(get().progress, name) })
      }
    },
    remove: async (name) => {
      const voices = await api.deleteVoice(name)
      set({ voices })
    },
    installEngine: async () => {
      set({ isInstalling: true, logs: [] })
      const ok = await api.installEngine()
      const isEngineInstalled = await api.isEngineInstalled()
      const voices = await api.listVoices()
      set({ isInstalling: false, isEngineInstalled, voices })
      if (!ok) {
        get().appendLog('Engine install finished but did not verify.')
      }
    },
    search: async (query) => {
      set({ isSearching: true, searchError: null, remote: [] })
      try {
        const remote = await api.searchVoices(query)
        set({ remote, isSearching: false })
      } catch (err) {
        set({ isSearching: false, searchError: String(err) })
      }
    },
    appendLog: (line) => {
      set({ logs: [...get().logs, line] })
    },
    setProgress: (name, p) => {
      set({ progress: { ...get().progress, [name]: p } })
    }
  }
})
