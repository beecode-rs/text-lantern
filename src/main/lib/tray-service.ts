import { Tray, Menu, type BrowserWindow } from 'electron'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { APP_NAME } from '@src/main/util/constants'
import { trayIconImageUtilSingleton } from '@src/main/util/tray-icon-image'
import { languageServiceSingleton } from '@src/shared/language/language-service'
import type { Lang } from '@src/shared/types'

export class TrayService {
  private _tray: Electron.Tray | null = null

  private _trayWindow: BrowserWindow | null = null

  public create(window: BrowserWindow): Tray {
    this._trayWindow = window
    this._tray = new Tray(trayIconImageUtilSingleton().outlineIcon())
    this._tray.setToolTip(APP_NAME)
    this._tray.setContextMenu(Menu.buildFromTemplate(this._buildTrayMenuTemplate()))
    this._tray.on('click', () => {
      window.show()
      window.focus()
    })
    return this._tray
  }

  public refreshMenu(): void {
    if (!this._tray || !this._trayWindow) {
      return
    }
    this._tray.setContextMenu(Menu.buildFromTemplate(this._buildTrayMenuTemplate()))
  }

  public setReading(reading: boolean): void {
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

  public destroy(): void {
    this._tray?.destroy()
    this._tray = null
  }

  protected _buildTrayMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const settings = settingsDalSingleton().get()
    const read = (lang: Lang): void => {
      void ttsServiceSingleton().speak({ lang, settings: settingsDalSingleton().get() })
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
      { label: 'Stop', click: () => { void ttsServiceSingleton().stop() } },
      { type: 'separator' },
      {
        label: 'Settings…',
        click: (): void => {
          if (this._trayWindow) {
            this._trayWindow.show()
            this._trayWindow.focus()
          }
        }
      },
      { role: 'quit', label: `Quit ${APP_NAME}` }
    )
    return items
  }
}

export const trayServiceSingleton = singletonPattern(() => new TrayService())
