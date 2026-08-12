import { ipcMain, type BrowserWindow } from 'electron'
import fs from 'node:fs'
import { settingsService } from './settings'
import { modelsService } from './models'
import { ttsService } from './tts'
import { shortcutsService } from './shortcuts'
import type { Lang } from '../shared/types'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  const send = (channel: string, ...args: unknown[]): void => {
    getWindow()?.webContents.send(channel, ...args)
  }

  ipcMain.handle('settings:get', () => {
    return settingsService.get()
  })
  ipcMain.handle('settings:update', (_e, patch) => {
    return settingsService.update({ patch })
  })

  ipcMain.handle('models:list', () => {
    return modelsService.listVoices()
  })
  ipcMain.handle('models:engineInstalled', () => {
    return modelsService.isEngineInstalled()
  })
  ipcMain.handle('models:installEngine', async (e) => {
    const ok = await modelsService.installEngine({
      onLog: (line) => {
        e.sender.send('models:log', line)
      }
    })
    return ok
  })
  ipcMain.handle('models:download', async (e, name: string) => {
    await modelsService.downloadVoice({
      name,
      onProgress: (p) => {
        e.sender.send('models:progress', { name, progress: p })
      }
    })
    return modelsService.listVoices()
  })
  ipcMain.handle('models:delete', (_e, name: string) => {
    modelsService.deleteVoice({ name })
    return modelsService.listVoices()
  })
  ipcMain.handle('models:setDefault', (_e, lang: 'sr' | 'en', name: string) => {
    if (lang === 'sr') {
      return settingsService.update({ patch: { voiceSr: name } })
    }
    return settingsService.update({ patch: { voiceEn: name } })
  })

  ipcMain.handle('tts:speak', (_e, lang: Lang, text?: string) => {
    void ttsService.speak({ lang, text, settings: settingsService.get() })
    return true
  })
  ipcMain.handle('tts:stop', () => {
    void ttsService.stop()
    return true
  })
  ipcMain.handle('tts:playbackEnded', () => {
    ttsService.playbackEnded()
    return true
  })
  ipcMain.handle('tts:loadWav', (_e, p: string) => {
    return fs.promises.readFile(p)
  })

  ipcMain.handle('shortcuts:reregister', () => {
    shortcutsService.registerAll()
    return true
  })
  ipcMain.handle('app:showSettings', () => {
    const win = getWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  ttsService.events.on('status', (s) => {
    send('tts:status', s)
  })
  ttsService.events.on('playWav', (p: string) => {
    send('tts:playWav', p)
  })
  ttsService.events.on('stopPlayback', () => {
    send('tts:stopPlayback')
  })

  settingsService.onChange(() => {
    shortcutsService.registerAll()
    send('settings:changed', settingsService.get())
  })
}
