import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { settingsService } from '@src/main/settings'
import { shortcutsService } from '@src/main/shortcuts'
import { trayService } from '@src/main/tray'
import { registerIpc } from '@src/main/ipc'
import { ttsService } from '@src/main/tts'
import type { TtsStatus } from '@src/shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 640,
    minHeight: 480,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#fbfbfb',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('close', (e) => {
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

function statusToReading(s: TtsStatus): void {
  trayService.setReading(s.state === 'synthesizing' || s.state === 'reading')
}

app.whenReady().then(() => {
  settingsService.init()
  const settings = settingsService.get()

  mainWindow = createWindow()
  if (settings.showTray) {
    trayService.create(mainWindow)
  }
  shortcutsService.registerAll()
  registerIpc(() => mainWindow)

  ttsService.events.on('status', statusToReading)

  if (!settings.startHidden || !app.isPackaged) {
    mainWindow.show()
  }
})

app.on('window-all-closed', () => {})

app.on('before-quit', () => {
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
