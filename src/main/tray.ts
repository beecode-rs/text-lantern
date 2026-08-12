import { Tray, Menu, type BrowserWindow, nativeImage } from 'electron'
import { ttsService } from './tts'
import { settingsService } from './settings'
import type { Lang } from '../shared/types'

const SIZE = 22

let tray: Electron.Tray | null = null
let idleIcon: Electron.NativeImage
let readingIcon: Electron.NativeImage

const inside = (px: number, py: number): boolean => {
  const x0 = 3
  const y0 = 3
  const x1 = 18
  const y1 = 14
  const r = 3
  let rx = px
  if (px < x0 + r) {
    rx = x0 + r
  } else if (px > x1 - r) {
    rx = x1 - r
  }
  let ry = py
  if (py < y0 + r) {
    ry = y0 + r
  } else if (py > y1 - r) {
    ry = y1 - r
  }
  const dx = px - rx
  const dy = py - ry
  const inBody =
    px >= x0 && px <= x1 && py >= y0 && py <= y1 && dx * dx + dy * dy <= r * r
  const inTail =
    py >= 13 && py <= 18 && px >= 6 && px <= 6 + (py - 13) * 1.5 && px <= 11
  return inBody || inTail
}

function bubbleShape(): Uint8Array {
  return Uint8Array.from({ length: SIZE * SIZE }, (_, i) => {
    const x = i % SIZE
    const y = Math.floor(i / SIZE)
    if (inside(x, y)) {
      return 1
    }
    return 0
  })
}

function gridToImage(grid: Uint8Array, filled: boolean): Electron.NativeImage {
  const buf = Buffer.alloc(SIZE * SIZE * 4)
  const idx = (x: number, y: number): number => {
    return y * SIZE + x
  }
  const isOn = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
      return false
    }
    return grid[idx(x, y)] === 1
  }
  Array.from({ length: SIZE * SIZE }, (_, i) => {
    const x = i % SIZE
    const y = Math.floor(i / SIZE)
    const o = i * 4
    let on: boolean
    if (filled) {
      on = isOn(x, y)
    } else {
      on =
        isOn(x, y) &&
        (!isOn(x - 1, y) || !isOn(x + 1, y) || !isOn(x, y - 1) || !isOn(x, y + 1))
    }
    buf[o] = 0
    buf[o + 1] = 0
    buf[o + 2] = 0
    if (on) {
      buf[o + 3] = 255
    } else {
      buf[o + 3] = 0
    }
    return undefined
  })
  const img = nativeImage.createFromBuffer(buf, { width: SIZE, height: SIZE })
  img.setTemplateImage(true)
  return img
}

function ensureIcons(): void {
  if (!idleIcon) {
    const shape = bubbleShape()
    idleIcon = gridToImage(shape, false)
    readingIcon = gridToImage(shape, true)
  }
}

function menuTemplate(window: BrowserWindow): Electron.MenuItemConstructorOptions[] {
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

function create(window: BrowserWindow): Tray {
  ensureIcons()
  tray = new Tray(idleIcon)
  tray.setToolTip('TTS Reader')
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate(window)))
  tray.on('click', () => {
    window.show()
    window.focus()
  })
  return tray
}

function setReading(reading: boolean): void {
  if (!tray) {
    return
  }
  ensureIcons()
  if (reading) {
    tray.setImage(readingIcon)
    tray.setToolTip('TTS Reader — reading…')
  } else {
    tray.setImage(idleIcon)
    tray.setToolTip('TTS Reader')
  }
}

function destroy(): void {
  tray?.destroy()
  tray = null
}

export const trayService = {
  create,
  setReading,
  destroy
}
