import { app, BrowserWindow, nativeImage, nativeTheme, shell, systemPreferences } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME, constant } from '@src/main/util/constants'
import { logger } from '@src/main/util/logger'
import { pathsUtil } from '@src/main/util/paths-util'
import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { historyDalSingleton } from '@src/main/dal/history-dal'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { ShortcutsService } from '@src/main/lib/shortcuts-service'
import { trayServiceSingleton } from '@src/main/lib/tray-service'
import { ipcController } from '@src/main/controller/ipc-controller'
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
    logger().error('could not migrate legacy user data:', err)
  }
}

function _applyAppIcon(): void {
  const icon = nativeImage.createFromPath(path.join(pathsUtil.projectRoot(), 'resource', 'icon.png'))
  if (icon.isEmpty()) {
    return
  }
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon)
  }
}

function _resolveBackgroundColor(params: { theme: ThemePreference }): string {
  const { theme } = params
  if (theme === 'dark') {
    return constant().mainWindow.darkBackground
  }
  if (theme === 'light') {
    return constant().mainWindow.lightBackground
  }
  return nativeTheme.shouldUseDarkColors
    ? constant().mainWindow.darkBackground
    : constant().mainWindow.lightBackground
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
      logger().debug(`renderer console: ${message}`)
    })
    win.webContents.on('did-finish-load', () => {
      logger().debug('renderer finished loading')
    })
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      logger().error(`renderer load failed ${code}: ${desc}`)
    })
    win.webContents.on('preload-error', (_e, p, err) => {
      logger().error(`preload error in ${p}: ${String(err)}`)
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
  trayServiceSingleton().setReading(s.state === 'synthesizing' || s.state === 'reading')
}

app.whenReady().then(() => {
  _migrateLegacyUserData()
  settingsDalSingleton().init()
  historyDalSingleton().init()
  const settings = settingsDalSingleton().get()

  if (process.platform === 'darwin') {
    void systemPreferences.isTrustedAccessibilityClient(true)
  }

  _applyAppIcon()
  mainWindow = _createWindow({ theme: settings.theme })
  trayServiceSingleton().create(mainWindow)
  new ShortcutsService().registerAll()
  ipcController.register(() => mainWindow)

  ttsServiceSingleton().events.on('status', _reflectReadingStateInTray)

  const prewarmVoice = settings.languageBindings[0]?.voice
  if (prewarmVoice) {
    void ttsServiceSingleton().prewarmVoice({ voice: prewarmVoice })
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
  ttsServiceSingleton().dispose()
  new ShortcutsService().unregisterAll()
  trayServiceSingleton().destroy()
})

app.on('will-quit', () => {
  new ShortcutsService().unregisterAll()
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
