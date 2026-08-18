import { create } from 'zustand'

import { api } from '#src/renderer/src/api'
import { useModelsStore } from '#src/renderer/src/store/models'

interface ConfigBackupStore {
  isExporting: boolean
  isImporting: boolean
  logs: string[]
  progress: Record<string, number>
  exportConfig: () => Promise<void>
  importConfig: () => Promise<void>
  appendLog: (line: string) => void
  setProgress: (name: string, p: number) => void
}

export const useConfigBackupStore = create<ConfigBackupStore>((set, get) => {
  const getImportSummaryLabel = (params: { failedCount: number }): string => {
    if (params.failedCount > 0) {
      return `Imported — ${String(params.failedCount)} voice download(s) failed.`
    }

    return 'Imported — all voices restored.'
  }

  return {
    appendLog: (line) => {
      set({ logs: [...get().logs, line] })
    },
    exportConfig: async () => {
      set({ isExporting: true })
      try {
        const didExport = await api.exportConfig()
        if (didExport) {
          get().appendLog('Configuration exported.')
        }
      } catch (err) {
        get().appendLog(`Export failed: ${String(err)}`)
      }
      set({ isExporting: false })
    },
    importConfig: async () => {
      set({ isImporting: true, logs: [], progress: {} })
      try {
        const result = await api.importConfig()
        if (result.errorMessage !== null) {
          get().appendLog(result.errorMessage)
        }
        if (result.didSucceed) {
          get().appendLog(getImportSummaryLabel({ failedCount: result.failedVoices.length }))
          void useModelsStore.getState().load()
        }
      } catch (err) {
        get().appendLog(`Import failed: ${String(err)}`)
      }
      set({ isImporting: false, progress: {} })
    },
    isExporting: false,

    isImporting: false,
    logs: [],
    progress: {},
    setProgress: (name, p) => {
      set({ progress: { ...get().progress, [name]: p } })
    },
  }
})
