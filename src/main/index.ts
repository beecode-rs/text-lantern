import { app, BrowserWindow, nativeImage, nativeTheme, shell, systemPreferences } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME } from '@src/main/util/constants'
import { pathsService } from '@src/main/util/paths-service'
import { settingsService } from '@src/main/business/service/settings-service'
import { historyService } from '@src/main/business/service/history-service'
import { shortcutsService } from '@src/main/business/service/shortcuts-service'
import { trayService } from '@src/main/business/service/tray-service'
import { ipcService } from '@src/main/controller/ipc-service'
import { ttsService } from '@src/main/business/service/tts-service'
import type { ThemePreference, TtsStatus } from '@src/shared/types'

app.setName(APP_NAME)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function _migrateLegacyUserData(): void {
  const legacyName = 'tts-reader'
  const appData = app.getPath('appData')
  const newPath = app.getPath('userData')
  const oldPath = path.join(appData, legacyName)
  if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) {
    return
  }
  try {
    fs.cpSync(oldPath, newPath, { recursive: true })
  } catch (err) {
    console.error('[main] could not migrate legacy user data:', err)
  }
}

function _applyAppIcon(): void {
  const icon = nativeImage.createFromPath(path.join(pathsService.projectRoot(), 'resource', 'icon.png'))
  if (icon.isEmpty()) {
    return
  }
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon)
  }
}

const LIGHT_WINDOW_BACKGROUND = '#F5F6FA'
const DARK_WINDOW_BACKGROUND = '#12131C'

function _resolveBackgroundColor(params: { theme: ThemePreference }): string {
  const { theme } = params
  if (theme === 'dark') {
    return DARK_WINDOW_BACKGROUND
  }
  if (theme === 'light') {
    return LIGHT_WINDOW_BACKGROUND
  }
  return nativeTheme.shouldUseDarkColors ? DARK_WINDOW_BACKGROUND : LIGHT_WINDOW_BACKGROUND
}

function _createWindow(params: { theme: ThemePreference }): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 640,
    minHeight: 480,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: _resolveBackgroundColor({ theme: params.theme }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('close', (e) => {
    if (isQuitting) {
      return
    }
    if (!app.isPackaged) {
      return
    }
    e.preventDefault()
    win.hide()
  })

  if (!app.isPackaged) {
    win.webContents.on('console-message', (_e, _level, message) => {
      console.log(`[renderer] ${message}`)
    })
    win.webContents.on('did-finish-load', () => {
      console.log('[main] renderer finished loading')
    })
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      console.log(`[main] renderer load FAILED ${code}: ${desc}`)
    })
    win.webContents.on('preload-error', (_e, p, err) => {
      console.log(`[main] preload error in ${p}: ${String(err)}`)
    })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

function _reflectReadingStateInTray(s: TtsStatus): void {
  trayService.setReading(s.state === 'synthesizing' || s.state === 'reading')
}

app.whenReady().then(() => {
  _migrateLegacyUserData()
  settingsService.init()
  historyService.init()
  const settings = settingsService.get()

  if (process.platform === 'darwin') {
    void systemPreferences.isTrustedAccessibilityClient(true)
  }

  _applyAppIcon()
  mainWindow = _createWindow({ theme: settings.theme })
  trayService.create(mainWindow)
  shortcutsService.registerAll()
  ipcService.register(() => mainWindow)

  ttsService.events.on('status', _reflectReadingStateInTray)

  const prewarmVoice = settings.languageBindings[0]?.voice
  if (prewarmVoice) {
    void ttsService.prewarmVoice({ voice: prewarmVoice })
  }

  if (!settings.startHidden || !app.isPackaged) {
    mainWindow.show()
  }
})

app.on('window-all-closed', () => {
  if (!app.isPackaged) {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  ttsService.dispose()
  shortcutsService.unregisterAll()
  trayService.destroy()
})

app.on('will-quit', () => {
  shortcutsService.unregisterAll()
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}
