import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import {
  type UpdateDownloadProgress,
  type UpdateDownloadResult,
  type UpdateDownloadStatus,
  type UpdateStatus,
} from '#src/shared/types'

export type UpdateFlowState = 'downloaded' | 'downloading' | 'idle' | 'installing' | 'restart-required'

interface UpdateStore {
  downloadError: string | null
  downloadPercent: number | null
  downloadResult: UpdateDownloadResult | null
  downloadState: UpdateFlowState
  status: UpdateStatus | null
  check: () => Promise<void>
  download: () => Promise<void>
  init: () => void
  load: () => Promise<void>
  replace: (status: UpdateStatus) => void
  replaceDownloadProgress: (progress: UpdateDownloadProgress) => void
  restart: () => void
}

let unsubscribeFromChanges: (() => void) | null = null

let unsubscribeFromDownloadChanges: (() => void) | null = null

const toDownloadPercent = (progress: UpdateDownloadProgress): number | null => {
  if (progress.totalBytes <= 0) {
    return null
  }

  return Math.floor((progress.receivedBytes / progress.totalBytes) * 100)
}

const toFlowState = (state: UpdateDownloadStatus): UpdateFlowState => {
  switch (state) {
    case 'completed': {
      return 'downloaded'
    }
    case 'downloading': {
      return 'downloading'
    }
    case 'installing': {
      return 'installing'
    }
    case 'restart-required': {
      return 'restart-required'
    }
    default: {
      return 'idle'
    }
  }
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  check: async () => {
    const status = await api.checkForUpdate()
    set({ status })
  },
  download: async () => {
    set({ downloadError: null, downloadPercent: null, downloadResult: null, downloadState: 'downloading' })
    try {
      const result = await api.downloadUpdate()
      set({ downloadResult: result })
    } catch (err) {
      set({ downloadError: String(err), downloadState: 'idle' })
    }
  },
  downloadError: null,

  downloadPercent: null,
  downloadResult: null,

  downloadState: 'idle',
  init: () => {
    if (unsubscribeFromChanges !== null) {
      return
    }
    unsubscribeFromChanges = api.onUpdateChanged(get().replace)
    unsubscribeFromDownloadChanges = api.onDownloadChanged(get().replaceDownloadProgress)
    void get().load()
  },

  load: async () => {
    const status = await api.getUpdateStatus()
    set({ status })
  },
  replace: (status) => {
    set({ status })
  },
  replaceDownloadProgress: (progress) => {
    set({
      downloadPercent: toDownloadPercent(progress),
      downloadState: toFlowState(progress.state),
    })
  },
  restart: () => {
    api.restartUpdate().catch(() => {
      return undefined
    })
  },
  status: null,
}))
