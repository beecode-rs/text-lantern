import { dialog, ipcMain, type BrowserWindow } from 'electron'

import { configBackupServiceSingleton } from '@src/main/business/service/config-backup-service'
import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { historyDalSingleton } from '@src/main/dal/history-dal'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { voiceModelDalSingleton } from '@src/main/dal/voice-model-dal'
import { piperEngineSingleton } from '@src/main/lib/piper/engine'
import { shortcutsSingleton } from '@src/main/lib/shortcuts'
import { traySingleton } from '@src/main/lib/tray'
import { constant } from '@src/main/util/constants'
import type { HistoryEntry, Lang, TtsSpeakOptions } from '@src/shared/types'

const handledChannels = [
  'settings:get',
  'settings:update',
  'models:list',
  'models:engineInstalled',
  'models:installEngine',
  'models:download',
  'models:delete',
  'models:search',
  'tts:speak',
  'tts:stop',
  'tts:playbackEnded',
  'shortcuts:reregister',
  'app:showSettings',
  'history:get',
  'history:clear',
  'config:export',
  'config:import'
]

let teardownFns: Array<() => void> = []

export const ipcController = {
  register(params: { getWindow: () => BrowserWindow | null }): void {
    const send = (channel: string, ...args: unknown[]): void => {
      params.getWindow()?.webContents.send(channel, ...args)
    }

    ipcMain.handle('settings:get', () => {
      return settingsDalSingleton().get()
    })
    ipcMain.handle('settings:update', (_e, patch) => {
      return settingsDalSingleton().update({ patch })
    })

    ipcMain.handle('models:list', () => {
      return voiceModelDalSingleton().listVoices()
    })
    ipcMain.handle('models:engineInstalled', () => {
      return piperEngineSingleton().isEngineInstalled()
    })
    ipcMain.handle('models:installEngine', async (e, voiceNames: string[]) => {
      const ok = await piperEngineSingleton().installEngine({
        voiceNames,
        onLog: (line) => {
          e.sender.send('models:log', line)
        }
      })
      return ok
    })
    ipcMain.handle('models:download', async (e, name: string) => {
      await piperEngineSingleton().downloadVoice({
        name,
        onProgress: (p) => {
          e.sender.send('models:progress', { name, progress: p })
        }
      })
      return voiceModelDalSingleton().listVoices()
    })
    ipcMain.handle('models:delete', (_e, name: string) => {
      voiceModelDalSingleton().deleteVoice({ name })
      return voiceModelDalSingleton().listVoices()
    })
    ipcMain.handle('models:search', (_e, query: string) => {
      return piperEngineSingleton().searchVoices({ query })
    })

    ipcMain.handle('tts:speak', (_e, lang: Lang, text?: string, options?: TtsSpeakOptions) => {
      void ttsServiceSingleton().speak({
        lang,
        text,
        shouldSkipHistory: options?.shouldSkipHistory,
        settings: settingsDalSingleton().get()
      })
      return true
    })
    ipcMain.handle('tts:stop', () => {
      void ttsServiceSingleton().stop()
      return true
    })
    ipcMain.handle('tts:playbackEnded', () => {
      ttsServiceSingleton().playbackEnded()
      return true
    })

    ipcMain.handle('shortcuts:reregister', () => {
      shortcutsSingleton().registerAll()
      return true
    })
    ipcMain.handle('app:showSettings', () => {
      const win = params.getWindow()
      if (win) {
        win.show()
        win.focus()
      }
    })

    ipcMain.handle('history:get', () => {
      return historyDalSingleton().get()
    })
    ipcMain.handle('history:clear', () => {
      historyDalSingleton().clear()
      return true
    })

    const showConfigSaveDialog = async (): Promise<string | null> => {
      const win = params.getWindow()
      const options: Electron.SaveDialogOptions = {
        title: 'Export configuration',
        defaultPath: constant().configBackup.defaultFileName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      }
      let res: Electron.SaveDialogReturnValue
      if (win === null) {
        res = await dialog.showSaveDialog(options)
      } else {
        res = await dialog.showSaveDialog(win, options)
      }
      if (res.canceled || res.filePath === undefined) {
        return null
      }
      if (res.filePath.endsWith('.json')) {
        return res.filePath
      }
      return `${res.filePath}.json`
    }

    const showConfigOpenDialog = async (): Promise<string | null> => {
      const win = params.getWindow()
      const options: Electron.OpenDialogOptions = {
        title: 'Import configuration',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      }
      let res: Electron.OpenDialogReturnValue
      if (win === null) {
        res = await dialog.showOpenDialog(options)
      } else {
        res = await dialog.showOpenDialog(win, options)
      }
      if (res.canceled || res.filePaths.length === 0) {
        return null
      }
      return res.filePaths[0]
    }

    ipcMain.handle('config:export', async () => {
      const filePath = await showConfigSaveDialog()
      if (filePath === null) {
        return false
      }
      configBackupServiceSingleton().exportToFile({ filePath })
      return true
    })

    ipcMain.handle('config:import', async (e) => {
      const filePath = await showConfigOpenDialog()
      if (filePath === null) {
        return { didSucceed: false, didCancel: true, failedVoices: [], errorMessage: null }
      }
      try {
        const result = await configBackupServiceSingleton().importFromFile({
          filePath,
          onLog: (line) => {
            e.sender.send('config:log', line)
          },
          onProgress: (p) => {
            e.sender.send('config:progress', p)
          }
        })
        return { ...result, didCancel: false, errorMessage: null }
      } catch (err) {
        return { didSucceed: false, didCancel: false, failedVoices: [], errorMessage: String(err) }
      }
    })

    const onTtsStatus = (s: unknown): void => {
      send('tts:status', s)
    }
    const onTtsAudioStart = (p: { sampleRate: number; voice: string }): void => {
      send('tts:audioStart', p)
    }
    const onTtsAudioChunk = (buf: Buffer): void => {
      send('tts:audioChunk', buf)
    }
    const onTtsAudioEnd = (): void => {
      send('tts:audioEnd')
    }
    const onTtsStopPlayback = (): void => {
      send('tts:stopPlayback')
    }
    ttsServiceSingleton().events.on('status', onTtsStatus)
    ttsServiceSingleton().events.on('audioStart', onTtsAudioStart)
    ttsServiceSingleton().events.on('audioChunk', onTtsAudioChunk)
    ttsServiceSingleton().events.on('audioEnd', onTtsAudioEnd)
    ttsServiceSingleton().events.on('stopPlayback', onTtsStopPlayback)

    const onHistoryChanged = (entries: HistoryEntry[]): void => {
      send('history:changed', entries)
    }
    historyDalSingleton().events.on('changed', onHistoryChanged)

    const unsubscribeSettingsChanged = settingsDalSingleton().onChange(() => {
      shortcutsSingleton().registerAll()
      traySingleton().refreshMenu()
      historyDalSingleton().prune()
      send('settings:changed', settingsDalSingleton().get())
    })

    teardownFns = [
      () => {
        ttsServiceSingleton().events.off('status', onTtsStatus)
      },
      () => {
        ttsServiceSingleton().events.off('audioStart', onTtsAudioStart)
      },
      () => {
        ttsServiceSingleton().events.off('audioChunk', onTtsAudioChunk)
      },
      () => {
        ttsServiceSingleton().events.off('audioEnd', onTtsAudioEnd)
      },
      () => {
        ttsServiceSingleton().events.off('stopPlayback', onTtsStopPlayback)
      },
      () => {
        historyDalSingleton().events.off('changed', onHistoryChanged)
      },
      unsubscribeSettingsChanged
    ]
  },

  unregister(): void {
    handledChannels.forEach((channel) => {
      ipcMain.removeHandler(channel)
    })
    teardownFns.forEach((teardownFn) => {
      teardownFn()
    })
    teardownFns = []
  }
}
