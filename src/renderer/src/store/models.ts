import { create } from 'zustand'
import type { RemoteVoice, Voice, VoiceDownload } from '@src/shared/types'
import { api } from '@src/renderer/src/api'

const DONE_DISMISS_DELAY_MS = 3000

interface ModelsStore {
  voices: Voice[]
  isEngineInstalled: boolean
  isInstalling: boolean
  logs: string[]
  downloads: Record<string, VoiceDownload>
  isLoading: boolean
  remote: RemoteVoice[]
  isSearching: boolean
  searchError: string | null

  load: () => Promise<void>
  refreshEngine: () => Promise<void>
  download: (name: string) => Promise<void>
  remove: (name: string) => Promise<void>
  dismissDownload: (name: string) => void
  installEngine: (voiceNames: string[]) => Promise<void>
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

  const markDownloadDone = (name: string): void => {
    set({ downloads: { ...get().downloads, [name]: { progress: 1, state: 'done' } } })
    setTimeout(() => {
      if (get().downloads[name]?.state === 'done') {
        set({ downloads: omit(get().downloads, name) })
      }
    }, DONE_DISMISS_DELAY_MS)
  }

  const markDownloadFailed = (name: string): void => {
    const failed = get().downloads[name]
    set({
      downloads: { ...get().downloads, [name]: { progress: failed?.progress ?? 0, state: 'error' } }
    })
  }

  return {
    voices: [],
    isEngineInstalled: false,
    isInstalling: false,
    logs: [],
    downloads: {},
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
      set({ downloads: { ...get().downloads, [name]: { progress: 0, state: 'downloading' } } })
      try {
        const voices = await api.downloadVoice(name)
        set({ voices })
        markDownloadDone(name)
      } catch (err) {
        get().appendLog(`Download failed for ${name}: ${String(err)}`)
        markDownloadFailed(name)
      }
    },
    remove: async (name) => {
      const voices = await api.deleteVoice(name)
      set({ voices })
    },
    dismissDownload: (name) => {
      set({ downloads: omit(get().downloads, name) })
    },
    installEngine: async (voiceNames) => {
      set({ isInstalling: true, logs: [] })
      const ok = await api.installEngine(voiceNames)
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
      const current = get().downloads[name]
      if (current !== undefined && current.state !== 'downloading') {
        return
      }
      set({ downloads: { ...get().downloads, [name]: { progress: p, state: 'downloading' } } })
    }
  }
})
