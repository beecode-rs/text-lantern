import { ipcMain, type BrowserWindow } from 'electron'

import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { historyDalSingleton } from '@src/main/dal/history-dal'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { voiceModelDalSingleton } from '@src/main/dal/voice-model-dal'
import { piperEngineSingleton } from '@src/main/lib/piper/engine'
import { Shortcuts } from '@src/main/lib/shortcuts'
import { traySingleton } from '@src/main/lib/tray'
import type { HistoryEntry, Lang } from '@src/shared/types'

export const ipcController = {
  register(getWindow: () => BrowserWindow | null): void {
    const send = (channel: string, ...args: unknown[]): void => {
      getWindow()?.webContents.send(channel, ...args)
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
    ipcMain.handle('models:installEngine', async (e) => {
      const ok = await piperEngineSingleton().installEngine({
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

    ipcMain.handle('tts:speak', (_e, lang: Lang, text?: string) => {
      void ttsServiceSingleton().speak({ lang, text, settings: settingsDalSingleton().get() })
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
      new Shortcuts().registerAll()
      return true
    })
    ipcMain.handle('app:showSettings', () => {
      const win = getWindow()
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

    ttsServiceSingleton().events.on('status', (s) => {
      send('tts:status', s)
    })
    ttsServiceSingleton().events.on('audioStart', (p: { sampleRate: number; voice: string }) => {
      send('tts:audioStart', p)
    })
    ttsServiceSingleton().events.on('audioChunk', (buf: Buffer) => {
      send('tts:audioChunk', buf)
    })
    ttsServiceSingleton().events.on('audioEnd', () => {
      send('tts:audioEnd')
    })
    ttsServiceSingleton().events.on('stopPlayback', () => {
      send('tts:stopPlayback')
    })

    historyDalSingleton().events.on('changed', (entries: HistoryEntry[]) => {
      send('history:changed', entries)
    })

    settingsDalSingleton().onChange(() => {
      new Shortcuts().registerAll()
      traySingleton().refreshMenu()
      historyDalSingleton().prune()
      send('settings:changed', settingsDalSingleton().get())
    })
  }
}
