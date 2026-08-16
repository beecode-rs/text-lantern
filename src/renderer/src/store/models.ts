import { create } from 'zustand'
import type { RemoteVoice, Voice } from '@src/shared/types'
import { api } from '@src/renderer/src/api'

interface ModelsStore {
  voices: Voice[]
  engineInstalled: boolean
  installing: boolean
  logs: string[]
  progress: Record<string, number>
  loading: boolean
  remote: RemoteVoice[]
  searching: boolean
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
    engineInstalled: false,
    installing: false,
    logs: [],
    progress: {},
    loading: false,
    remote: [],
    searching: false,
    searchError: null,

    load: async () => {
      set({ loading: true })
      const [voices, engineInstalled] = await Promise.all([api.listVoices(), api.engineInstalled()])
      set({ voices, engineInstalled, loading: false })
    },
    refreshEngine: async () => {
      set({ engineInstalled: await api.engineInstalled() })
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
      set({ installing: true, logs: [] })
      const ok = await api.installEngine()
      const engineInstalled = await api.engineInstalled()
      const voices = await api.listVoices()
      set({ installing: false, engineInstalled, voices })
      if (!ok) {
        get().appendLog('Engine install finished but did not verify.')
      }
    },
    search: async (query) => {
      set({ searching: true, searchError: null, remote: [] })
      try {
        const remote = await api.searchVoices(query)
        set({ remote, searching: false })
      } catch (err) {
        set({ searching: false, searchError: String(err) })
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
