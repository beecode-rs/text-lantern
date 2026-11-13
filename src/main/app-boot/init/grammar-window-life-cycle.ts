import { LifeCycle } from '@beecode/msh-app-boot'
import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { BrowserWindow, app, nativeTheme, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { grammarServiceSingleton } from '#src/main/business/service/grammar-service'
import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import { GrammarCheckState, type GrammarCheckStatus, type ThemePreference } from '#src/shared/types'

export class GrammarWindowLifeCycle extends LifeCycle {
  protected _win: BrowserWindow | null = null

  protected _showOnCheckStatus: ((status: GrammarCheckStatus) => void) | null = null

  constructor() {
    super({ name: 'Grammar window' })
  }

  getWindow(): BrowserWindow | null {
    return this._win
  }

  show(): void {
    this._win = this._win ?? this._buildWindow()
    this._win.show()
    this._win.focus()
  }

  protected _createFn(): Promise<void> {
    this._showOnCheckStatus = (status: GrammarCheckStatus): void => {
      if (this._isCheckVisibleStatus({ state: status.state })) {
        this.show()
      }
    }
    grammarServiceSingleton().events.on('status', this._showOnCheckStatus)

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    if (this._showOnCheckStatus !== null) {
      grammarServiceSingleton().events.off('status', this._showOnCheckStatus)
      this._showOnCheckStatus = null
    }
    this._win?.destroy()
    this._win = null

    return Promise.resolve()
  }

  protected _isCheckVisibleStatus(params: { state: GrammarCheckState }): boolean {
    if (params.state === GrammarCheckState.CHECKING) {
      return true
    }
    if (params.state === GrammarCheckState.DONE) {
      return true
    }

    return params.state === GrammarCheckState.ERROR
  }

  protected _buildWindow(): BrowserWindow {
    const settings = settingsDalSingleton().get()
    const win = new BrowserWindow({
      backgroundColor: this._resolveBackgroundColor({ theme: settings.theme }),
      fullscreenable: false,
      height: 640,
      maximizable: false,
      minHeight: 400,
      minWidth: 420,
      resizable: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(this._bundleDir(), '../preload/index.mjs'),
        sandbox: false,
      },
      width: 560,
    })

    win.on('closed', () => {
      this._win = null
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
      logger().debug(`grammar renderer console: ${message}`)
    })
    win.webContents.on('did-finish-load', () => {
      logger().debug('grammar renderer finished loading')
    })
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      logger().error(`grammar renderer load failed ${String(code)}: ${desc}`)
    })
    win.webContents.on('preload-error', (_e, p, err) => {
      logger().error(`grammar preload error in ${p}: ${String(err)}`)
    })
  }

  protected _loadRenderer(params: { win: BrowserWindow }): void {
    const { win } = params
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (rendererUrl) {
      void win.loadURL(`${rendererUrl}#grammar`)

      return
    }
    void win.loadFile(path.join(this._bundleDir(), '../renderer/index.html'), { hash: 'grammar' })
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

export const grammarWindowLifeCycleSingleton = singletonPattern(() => {
  return new GrammarWindowLifeCycle()
})
