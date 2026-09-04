import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import {
  CosyvoiceArtifactKind,
  type CosyvoiceArtifactRef,
  cosyvoiceArtifactUtil,
} from '#src/renderer/src/lib/cosyvoice-artifact'
import { type RemoteVoice, type Voice, type VoiceDownload } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'
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
  download: (id: string) => Promise<void>
  downloadFromUrl: (url: string) => Promise<void>
  remove: (id: string) => Promise<void>
  dismissDownload: (id: string) => void
  installEngine: (voiceNames: string[]) => Promise<void>
  search: (query: string) => Promise<void>
  appendLog: (line: string) => void
  setProgress: (id: string, p: number) => void
  acknowledgeCompletedDownload: () => void
}

export const useModelsStore = create<ModelsStore>((set, get) => {
  const getDownload = (id: string): VoiceDownload | undefined => {
    return get().downloads[id]
  }

  const omitDownload = (downloads: Record<string, VoiceDownload>, key: string): Record<string, VoiceDownload> => {
    const { [key]: _removed, ...rest } = downloads

    return rest
  }

  const toQualifiedId = (id: string): string => {
    return voiceIdParser.build(voiceIdParser.parse({ id }))
  }

  const downloadVoiceArtifact = async (params: { id: string }): Promise<Voice[]> => {
    const artifact = cosyvoiceArtifactUtil.parse({ id: params.id })
    if (artifact !== null) {
      await downloadCosyvoiceArtifact({ artifact })

      return api.listVoices()
    }

    return api.downloadVoice(params.id)
  }

  const downloadCosyvoiceArtifact = async (params: { artifact: CosyvoiceArtifactRef }): Promise<void> => {
    switch (params.artifact.kind) {
      case CosyvoiceArtifactKind.ENGINE: {
        await api.installCosyvoiceEngine()

        return
      }
      case CosyvoiceArtifactKind.FRONTEND: {
        await api.downloadCosyvoiceFrontend()

        return
      }
      case CosyvoiceArtifactKind.MODEL: {
        await api.downloadCosyvoiceModel(params.artifact.fileName)

        return
      }
      default: {
        throw new Error('This CosyVoice artifact cannot be downloaded.')
      }
    }
  }

  const markDownloadDone = (id: string): void => {
    set({ downloads: { ...get().downloads, [id]: { progress: 1, state: 'done' } } })
    setTimeout(() => {
      if (getDownload(id)?.state === 'done') {
        set({ downloads: omitDownload(get().downloads, id) })
      }
    }, DONE_DISMISS_DELAY_MS)
  }

  const markDownloadFailed = (id: string): void => {
    const failed = getDownload(id)
    set({
      downloads: { ...get().downloads, [id]: { progress: failed?.progress ?? 0, state: 'error' } },
    })
  }

  return {
    acknowledgeCompletedDownload: () => {
      set({ hasCompletedDownload: false })
    },
    appendLog: (line) => {
      set({ logs: [...get().logs, line] })
    },
    dismissDownload: (id) => {
      set({ downloads: omitDownload(get().downloads, id) })
    },
    download: async (id) => {
      const qualifiedId = toQualifiedId(id)
      set({ downloads: { ...get().downloads, [qualifiedId]: { progress: 0, state: 'downloading' } } })
      try {
        const voices = await downloadVoiceArtifact({ id: qualifiedId })
        set({ hasCompletedDownload: true, voices })
        markDownloadDone(qualifiedId)
      } catch (err) {
        get().appendLog(`Download failed for ${qualifiedId}: ${String(err)}`)
        markDownloadFailed(qualifiedId)
      }
    },
    downloadFromUrl: async (url) => {
      const parsed = voiceUrlParser.parse({ url })
      if (!parsed) {
        get().appendLog(`Invalid voice URL: ${url}`)

        return
      }
      const id = toQualifiedId(parsed.name)
      set({ downloads: { ...get().downloads, [id]: { progress: 0, state: 'downloading' } } })
      try {
        const voices = await api.downloadVoiceFromUrl(url)
        set({ hasCompletedDownload: true, voices })
        markDownloadDone(id)
      } catch (err) {
        get().appendLog(`Download failed for ${id}: ${String(err)}`)
        markDownloadFailed(id)
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
    remove: async (id) => {
      const voices = await api.deleteVoice(toQualifiedId(id))
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
    setProgress: (id, p) => {
      const current = getDownload(id)
      if (current !== undefined && current.state !== 'downloading') {
        return
      }
      set({ downloads: { ...get().downloads, [id]: { progress: p, state: 'downloading' } } })
    },
    voices: [],
  }
})
