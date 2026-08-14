import { Tray, Menu, type BrowserWindow } from 'electron'
import { ttsService } from '@src/main/business/service/tts-service'
import { settingsService } from '@src/main/business/service/settings-service'
import { APP_NAME } from '@src/main/util/constants'
import { trayIconImageUtil } from '@src/main/util/tray-icon-image'
import { languageServiceSingleton } from '@src/shared/language/language-service'
import type { Lang } from '@src/shared/types'

let tray: Electron.Tray | null = null
let trayWindow: BrowserWindow | null = null

function _buildTrayMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  const settings = settingsService.get()
  const read = (lang: Lang): void => {
    void ttsService.speak({ lang, settings: settingsService.get() })
  }
  const items: Electron.MenuItemConstructorOptions[] = [
    { label: 'Read selection (auto)', click: () => { read('auto') } }
  ]
  settings.languageBindings.forEach((binding) => {
    items.push({
      label: `Read — ${languageServiceSingleton().getDisplayName({ code: binding.langCode })} (${binding.voice})`,
      click: () => { read(binding.langCode) }
    })
  })
  items.push(
    { type: 'separator' },
    { label: 'Stop', click: () => { void ttsService.stop() } },
    { type: 'separator' },
    {
      label: 'Settings…',
      click: (): void => {
        if (trayWindow) {
          trayWindow.show()
          trayWindow.focus()
        }
      }
    },
    { role: 'quit', label: `Quit ${APP_NAME}` }
  )
  return items
}

export const trayService = {
  create(window: BrowserWindow): Tray {
    trayWindow = window
    tray = new Tray(trayIconImageUtil.outlineIcon())
    tray.setToolTip(APP_NAME)
    tray.setContextMenu(Menu.buildFromTemplate(_buildTrayMenuTemplate()))
    tray.on('click', () => {
      window.show()
      window.focus()
    })
    return tray
  },

  refreshMenu(): void {
    if (!tray || !trayWindow) {
      return
    }
    tray.setContextMenu(Menu.buildFromTemplate(_buildTrayMenuTemplate()))
  },

  setReading(reading: boolean): void {
    if (!tray) {
      return
    }
    if (reading) {
      tray.setImage(trayIconImageUtil.filledIcon())
      tray.setToolTip(`${APP_NAME} — reading…`)
    } else {
      tray.setImage(trayIconImageUtil.outlineIcon())
      tray.setToolTip(APP_NAME)
    }
  },

  destroy(): void {
    tray?.destroy()
    tray = null
  }
}
