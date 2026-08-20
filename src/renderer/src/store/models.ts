import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import type { RemoteVoice, Voice, VoiceDownload } from '#src/shared/types'
import { voiceUrlParser } from '#src/shared/voice/voice-url'

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
  hasCompletedDownload: boolean

  load: () => Promise<void>
  refreshEngine: () => Promise<void>
  download: (name: string) => Promise<void>
  downloadFromUrl: (url: string) => Promise<void>
  remove: (name: string) => Promise<void>
  dismissDownload: (name: string) => void
  installEngine: (voiceNames: string[]) => Promise<void>
  search: (query: string) => Promise<void>
  appendLog: (line: string) => void
  setProgress: (name: string, p: number) => void
  acknowledgeCompletedDownload: () => void
}

export const useModelsStore = create<ModelsStore>((set, get) => {
  const getDownload = (name: string): VoiceDownload | undefined => {
    return get().downloads[name]
  }

  const omitDownload = (downloads: Record<string, VoiceDownload>, key: string): Record<string, VoiceDownload> => {
    const { [key]: _removed, ...rest } = downloads

    return rest
  }

  const markDownloadDone = (name: string): void => {
    set({ downloads: { ...get().downloads, [name]: { progress: 1, state: 'done' } } })
    setTimeout(() => {
      if (getDownload(name)?.state === 'done') {
        set({ downloads: omitDownload(get().downloads, name) })
      }
    }, DONE_DISMISS_DELAY_MS)
  }

  const markDownloadFailed = (name: string): void => {
    const failed = getDownload(name)
    set({
      downloads: { ...get().downloads, [name]: { progress: failed?.progress ?? 0, state: 'error' } },
    })
  }

  return {
    acknowledgeCompletedDownload: () => {
      set({ hasCompletedDownload: false })
    },
    appendLog: (line) => {
      set({ logs: [...get().logs, line] })
    },
    dismissDownload: (name) => {
      set({ downloads: omitDownload(get().downloads, name) })
    },
    download: async (name) => {
      set({ downloads: { ...get().downloads, [name]: { progress: 0, state: 'downloading' } } })
      try {
        const voices = await api.downloadVoice(name)
        set({ hasCompletedDownload: true, voices })
        markDownloadDone(name)
      } catch (err) {
        get().appendLog(`Download failed for ${name}: ${String(err)}`)
        markDownloadFailed(name)
      }
    },
    downloadFromUrl: async (url) => {
      const parsed = voiceUrlParser.parse({ url })
      if (!parsed) {
        get().appendLog(`Invalid voice URL: ${url}`)

        return
      }
      set({ downloads: { ...get().downloads, [parsed.name]: { progress: 0, state: 'downloading' } } })
      try {
        const voices = await api.downloadVoiceFromUrl(url)
        set({ hasCompletedDownload: true, voices })
        markDownloadDone(parsed.name)
      } catch (err) {
        get().appendLog(`Download failed for ${parsed.name}: ${String(err)}`)
        markDownloadFailed(parsed.name)
      }
    },
    downloads: {},
    hasCompletedDownload: false,
    installEngine: async (voiceNames) => {
      set({ isInstalling: true, logs: [] })
      const ok = await api.installEngine(voiceNames)
      const isEngineInstalled = await api.isEngineInstalled()
      const voices = await api.listVoices()
      set({ hasCompletedDownload: voices.length > 0, isEngineInstalled, isInstalling: false, voices })
      if (!ok) {
        get().appendLog('Engine install finished but did not verify.')
      }
    },
    isEngineInstalled: false,
    isInstalling: false,
    isLoading: false,

    isSearching: false,
    load: async () => {
      set({ isLoading: true })
      const [voices, isEngineInstalled] = await Promise.all([api.listVoices(), api.isEngineInstalled()])
      set({ isEngineInstalled, isLoading: false, voices })
    },
    logs: [],
    refreshEngine: async () => {
      set({ isEngineInstalled: await api.isEngineInstalled() })
    },
    remote: [],
    remove: async (name) => {
      const voices = await api.deleteVoice(name)
      set({ voices })
    },
    search: async (query) => {
      set({ isSearching: true, remote: [], searchError: null })
      try {
        const remote = await api.searchVoices(query)
        set({ isSearching: false, remote })
      } catch (err) {
        set({ isSearching: false, searchError: String(err) })
      }
    },
    searchError: null,
    setProgress: (name, p) => {
      const current = getDownload(name)
      if (current !== undefined && current.state !== 'downloading') {
        return
      }
      set({ downloads: { ...get().downloads, [name]: { progress: p, state: 'downloading' } } })
    },
    voices: [],
  }
})
