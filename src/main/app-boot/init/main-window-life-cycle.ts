import { LifeCycle } from '@beecode/msh-app-boot'
import { BrowserWindow, app, nativeTheme, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import type { ThemePreference } from '#src/shared/types'

export class MainWindowLifeCycle extends LifeCycle {
  protected _win: BrowserWindow | null = null

  protected _destroying = false

  constructor() {
    super({ name: 'Main window' })
  }

  getWindow(): BrowserWindow | null {
    return this._win
  }

  show(): void {
    this._win?.show()
    this._win?.focus()
  }

  beginDestroy(): void {
    this._destroying = true
  }

  isDestroying(): boolean {
    return this._destroying
  }

  protected _createFn(): Promise<void> {
    const settings = settingsDalSingleton().get()
    this._win = this._buildWindow({ theme: settings.theme })
    if (!settings.shouldStartHidden || !app.isPackaged) {
      this._win.show()
    }

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    this.beginDestroy()
    this._win?.destroy()
    this._win = null

    return Promise.resolve()
  }

  protected _buildWindow(params: { theme: ThemePreference }): BrowserWindow {
    const win = new BrowserWindow({
      backgroundColor: this._resolveBackgroundColor({ theme: params.theme }),
      height: 620,
      minHeight: 480,
      minWidth: 640,
      show: false,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 18 },
      webPreferences: {
        contextIsolation: true,
        preload: path.join(this._bundleDir(), '../preload/index.mjs'),
        sandbox: false,
      },
      width: 900,
    })

    win.on('close', (e) => {
      if (this._destroying) {
        return
      }
      e.preventDefault()
      if (settingsDalSingleton().get().shouldCloseToTray) {
        win.hide()

        return
      }
      app.quit()
    })

    this._attachDevDiagnostics({ win })

    win.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url)

      return { action: 'deny' }
    })

    this._loadRenderer({ win })

    return win
  }

  protected _attachDevDiagnostics(params: { win: BrowserWindow }): void {
    if (app.isPackaged) {
      return
    }
    const { win } = params
    win.webContents.on('console-message', (_e, _level, message) => {
      logger().debug(`renderer console: ${message}`)
    })
    win.webContents.on('did-finish-load', () => {
      logger().debug('renderer finished loading')
    })
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      logger().error(`renderer load failed ${String(code)}: ${desc}`)
    })
    win.webContents.on('preload-error', (_e, p, err) => {
      logger().error(`preload error in ${p}: ${String(err)}`)
    })
  }

  protected _loadRenderer(params: { win: BrowserWindow }): void {
    const { win } = params
    if (process.env['ELECTRON_RENDERER_URL']) {
      void win.loadURL(process.env['ELECTRON_RENDERER_URL'])

      return
    }
    void win.loadFile(path.join(this._bundleDir(), '../renderer/index.html'))
  }

  protected _resolveBackgroundColor(params: { theme: ThemePreference }): string {
    const { theme } = params
    if (theme === 'dark') {
      return constant().mainWindow.darkBackground
    }
    if (theme === 'light') {
      return constant().mainWindow.lightBackground
    }
    if (nativeTheme.shouldUseDarkColors) {
      return constant().mainWindow.darkBackground
    }

    return constant().mainWindow.lightBackground
  }

  protected _bundleDir(): string {
    return path.dirname(fileURLToPath(import.meta.url))
  }
}
