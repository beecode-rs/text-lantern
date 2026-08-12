import { Tray, Menu, type BrowserWindow } from 'electron'
import { ttsService } from '@src/main/business/service/tts-service'
import { settingsService } from '@src/main/business/service/settings-service'
import { trayIconImageUtil } from '@src/main/util/tray-icon-image'
import type { Lang } from '@src/shared/types'

let tray: Electron.Tray | null = null

function _buildTrayMenuTemplate(window: BrowserWindow): Electron.MenuItemConstructorOptions[] {
  const s = settingsService.get()
  const read = (lang: Lang): void => {
    void ttsService.speak({ lang, settings: settingsService.get() })
  }
  return [
    { label: 'Read selection (auto)', click: () => { read('auto') } },
    { label: `Read — Serbian (${s.voiceSr})`, click: () => { read('sr') } },
    { label: `Read — English (${s.voiceEn})`, click: () => { read('en') } },
    { type: 'separator' },
    { label: 'Stop', click: () => { void ttsService.stop() } },
    { type: 'separator' },
    {
      label: 'Settings…',
      click: (): void => {
        window.show()
        window.focus()
      }
    },
    { role: 'quit', label: 'Quit TTS Reader' }
  ]
}

export const trayService = {
  create(window: BrowserWindow): Tray {
    tray = new Tray(trayIconImageUtil.outlineIcon())
    tray.setToolTip('TTS Reader')
    tray.setContextMenu(Menu.buildFromTemplate(_buildTrayMenuTemplate(window)))
    tray.on('click', () => {
      window.show()
      window.focus()
    })
    return tray
  },

  setReading(reading: boolean): void {
    if (!tray) {
      return
    }
    if (reading) {
      tray.setImage(trayIconImageUtil.filledIcon())
      tray.setToolTip('TTS Reader — reading…')
    } else {
      tray.setImage(trayIconImageUtil.outlineIcon())
      tray.setToolTip('TTS Reader')
    }
  },

  destroy(): void {
    tray?.destroy()
    tray = null
  }
}
