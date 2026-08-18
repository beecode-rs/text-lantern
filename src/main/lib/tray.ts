import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type BrowserWindow, Tray as ElectronTray, Menu } from 'electron'

import { ttsServiceSingleton } from '#src/main/business/service/tts-service'
import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { APP_NAME } from '#src/main/util/constants'
import { trayIconImageUtilSingleton } from '#src/main/util/tray-icon-image-util'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { Lang } from '#src/shared/types'

export class Tray {
  protected _tray: Electron.Tray | null = null

  protected _trayWindow: BrowserWindow | null = null

  create(params: { window: BrowserWindow }): Electron.Tray {
    this._trayWindow = params.window
    this._tray = new ElectronTray(trayIconImageUtilSingleton().outlineIcon())
    this._tray.setToolTip(APP_NAME)
    this._tray.setContextMenu(Menu.buildFromTemplate(this._buildTrayMenuTemplate()))
    this._tray.on('click', () => {
      params.window.show()
      params.window.focus()
    })

    return this._tray
  }

  refreshMenu(): void {
    if (!this._tray || !this._trayWindow) {
      return
    }
    this._tray.setContextMenu(Menu.buildFromTemplate(this._buildTrayMenuTemplate()))
  }

  setReading(reading: boolean): void {
    if (!this._tray) {
      return
    }
    if (reading) {
      this._tray.setImage(trayIconImageUtilSingleton().filledIcon())
      this._tray.setToolTip(`${APP_NAME} — reading…`)
    } else {
      this._tray.setImage(trayIconImageUtilSingleton().outlineIcon())
      this._tray.setToolTip(APP_NAME)
    }
  }

  destroy(): void {
    this._tray?.destroy()
    this._tray = null
  }

  protected _buildTrayMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const settings = settingsDalSingleton().get()
    const read = (lang: Lang): void => {
      void ttsServiceSingleton().speak({ lang, settings: settingsDalSingleton().get() })
    }
    const readAutoItem: Electron.MenuItemConstructorOptions = {
      click: () => {
        read('auto')
      },
      label: 'Read selection (auto)',
    }
    const items: Electron.MenuItemConstructorOptions[] = [readAutoItem]
    settings.languageBindings.forEach((binding) => {
      items.push({
        click: () => {
          read(binding.langCode)
        },
        label: `Read — ${languageCatalogSingleton().getDisplayName({ code: binding.langCode })} (${binding.voice})`,
      })
    })
    items.push(
      { type: 'separator' },
      {
        click: () => {
          void ttsServiceSingleton().stop()
        },
        label: 'Stop',
      },
      { type: 'separator' },
      {
        click: (): void => {
          if (this._trayWindow) {
            this._trayWindow.show()
            this._trayWindow.focus()
          }
        },
        label: 'Settings…',
      },
      { label: `Quit ${APP_NAME}`, role: 'quit' },
    )

    return items
  }
}

export const traySingleton = singletonPattern(() => new Tray())
