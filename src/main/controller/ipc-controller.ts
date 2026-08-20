import { type BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs'

import { configBackupServiceSingleton } from '#src/main/business/service/config-backup-service'
import { ttsServiceSingleton } from '#src/main/business/service/tts-service'
import { historyDalSingleton } from '#src/main/dal/history-dal'
import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { voiceModelDalSingleton } from '#src/main/dal/voice-model-dal'
import { piperEngineSingleton } from '#src/main/lib/piper/engine'
import { shortcutsSingleton } from '#src/main/lib/shortcuts'
import { traySingleton } from '#src/main/lib/tray'
import { constant } from '#src/main/util/constants'
import { pathUtil } from '#src/main/util/path-util'
import type { HistoryEntry, Lang, Settings, TtsSpeakOptions } from '#src/shared/types'
import { voiceUrlParser } from '#src/shared/voice/voice-url'

const handledChannels = [
  'settings:get',
  'settings:update',
  'models:list',
  'models:engineInstalled',
  'models:installEngine',
  'models:download',
  'models:downloadFromUrl',
  'models:delete',
  'models:search',
  'models:openModelsFolder',
  'tts:speak',
  'tts:stop',
  'tts:playbackEnded',
  'shortcuts:reregister',
  'app:showSettings',
  'history:get',
  'history:clear',
  'history:remove',
  'config:export',
  'config:import',
]

let teardownFns: (() => void)[] = []

export const ipcController = {
  register(params: { getWindow: () => BrowserWindow | null }): void {
    const send = (channel: string, ...args: unknown[]): void => {
      params.getWindow()?.webContents.send(channel, ...args)
    }

    ipcMain.handle('settings:get', () => {
      return settingsDalSingleton().get()
    })
    ipcMain.handle('settings:update', (_e, patch: Partial<Settings>) => {
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
        onLog: (line) => {
          e.sender.send('models:log', line)
        },
        voiceNames,
      })

      return ok
    })
    ipcMain.handle('models:download', async (e, name: string) => {
      await piperEngineSingleton().downloadVoice({
        name,
        onProgress: (p) => {
          e.sender.send('models:progress', { name, progress: p })
        },
      })

      return voiceModelDalSingleton().listVoices()
    })
    ipcMain.handle('models:downloadFromUrl', async (e, url: string) => {
      const parsed = voiceUrlParser.parse({ url })
      if (!parsed) {
        throw new Error('Not a voice file link — it must point to a .onnx or .onnx.json file.')
      }
      await piperEngineSingleton().downloadVoiceFromUrl({
        onProgress: (p) => {
          e.sender.send('models:progress', { name: parsed.name, progress: p })
        },
        url,
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
    ipcMain.handle('models:openModelsFolder', async () => {
      fs.mkdirSync(pathUtil.modelsDir(), { recursive: true })
      const errorMessage = await shell.openPath(pathUtil.modelsDir())

      return errorMessage === ''
    })

    ipcMain.handle('tts:speak', (_e, lang: Lang, text?: string, options?: TtsSpeakOptions) => {
      void ttsServiceSingleton().speak({
        lang,
        settings: settingsDalSingleton().get(),
        shouldSkipHistory: options?.shouldSkipHistory,
        text,
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
    ipcMain.handle('history:remove', (_e, id: string) => {
      historyDalSingleton().remove({ id })

      return true
    })

    const showConfigSaveDialog = async (): Promise<string | null> => {
      const win = params.getWindow()
      const options: Electron.SaveDialogOptions = {
        defaultPath: constant().configBackup.defaultFileName,
        filters: [{ extensions: ['json'], name: 'JSON' }],
        title: 'Export configuration',
      }
      let res: Electron.SaveDialogReturnValue
      if (win === null) {
        res = await dialog.showSaveDialog(options)
      } else {
        res = await dialog.showSaveDialog(win, options)
      }
      if (res.canceled || res.filePath === '') {
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
        filters: [{ extensions: ['json'], name: 'JSON' }],
        properties: ['openFile'],
        title: 'Import configuration',
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
        return { didCancel: true, didSucceed: false, errorMessage: null, failedVoices: [] }
      }
      try {
        const result = await configBackupServiceSingleton().importFromFile({
          filePath,
          onLog: (line) => {
            e.sender.send('config:log', line)
          },
          onProgress: (p) => {
            e.sender.send('config:progress', p)
          },
        })

        return { ...result, didCancel: false, errorMessage: null }
      } catch (err) {
        return { didCancel: false, didSucceed: false, errorMessage: String(err), failedVoices: [] }
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
      unsubscribeSettingsChanged,
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
  },
}
