import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import { type UpdateDownloadResult, type UpdateStatus } from '#src/shared/types'

interface UpdateStore {
  downloadError: string | null
  downloadResult: UpdateDownloadResult | null
  isDownloading: boolean
  status: UpdateStatus | null
  check: () => Promise<void>
  download: () => Promise<void>
  init: () => void
  load: () => Promise<void>
  replace: (status: UpdateStatus) => void
}

let unsubscribeFromChanges: (() => void) | null = null

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  check: async () => {
    const status = await api.checkForUpdate()
    set({ status })
  },
  download: async () => {
    set({ downloadError: null, downloadResult: null, isDownloading: true })
    try {
      const result = await api.downloadUpdate()
      set({ downloadResult: result })
    } catch (err) {
      set({ downloadError: String(err) })
    }
    set({ isDownloading: false })
  },
  downloadError: null,

  downloadResult: null,
  init: () => {
    if (unsubscribeFromChanges !== null) {
      return
    }
    unsubscribeFromChanges = api.onUpdateChanged(get().replace)
    void get().load()
  },
  isDownloading: false,

  load: async () => {
    const status = await api.getUpdateStatus()
    set({ status })
  },
  replace: (status) => {
    set({ status })
  },
  status: null,
}))
