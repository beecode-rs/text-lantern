import { nativeImage, type NativeImage } from 'electron'

const ICON_PIXEL_SIZE = 22

function _isPixelInsideSpeechBubbleShape(px: number, py: number): boolean {
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

function _buildSpeechBubblePixelGrid(): Uint8Array {
  return Uint8Array.from({ length: ICON_PIXEL_SIZE * ICON_PIXEL_SIZE }, (_unused, i) => {
    const x = i % ICON_PIXEL_SIZE
    const y = Math.floor(i / ICON_PIXEL_SIZE)
    if (_isPixelInsideSpeechBubbleShape(x, y)) {
      return 1
    }
    return 0
  })
}

function _pixelIndexInGrid(x: number, y: number): number {
  return y * ICON_PIXEL_SIZE + x
}

function _isGridPixelOn(grid: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= ICON_PIXEL_SIZE || y >= ICON_PIXEL_SIZE) {
    return false
  }
  return grid[_pixelIndexInGrid(x, y)] === 1
}

function _isPixelOnShapeEdge(grid: Uint8Array, x: number, y: number): boolean {
  return (
    !_isGridPixelOn(grid, x - 1, y) ||
    !_isGridPixelOn(grid, x + 1, y) ||
    !_isGridPixelOn(grid, x, y - 1) ||
    !_isGridPixelOn(grid, x, y + 1)
  )
}

function _renderPixelGridToImage(params: { grid: Uint8Array; filled: boolean }): NativeImage {
  const { grid, filled } = params
  const buf = Buffer.alloc(ICON_PIXEL_SIZE * ICON_PIXEL_SIZE * 4)
  Array.from({ length: ICON_PIXEL_SIZE * ICON_PIXEL_SIZE }, (_unused, i) => {
    const x = i % ICON_PIXEL_SIZE
    const y = Math.floor(i / ICON_PIXEL_SIZE)
    const o = i * 4
    const pixelIsOn = _isGridPixelOn(grid, x, y)
    let lit: boolean
    if (filled) {
      lit = pixelIsOn
    } else {
      lit = pixelIsOn && _isPixelOnShapeEdge(grid, x, y)
    }
    buf[o] = 0
    buf[o + 1] = 0
    buf[o + 2] = 0
    if (lit) {
      buf[o + 3] = 255
    } else {
      buf[o + 3] = 0
    }
    return undefined
  })
  const img = nativeImage.createFromBuffer(buf, {
    width: ICON_PIXEL_SIZE,
    height: ICON_PIXEL_SIZE
  })
  img.setTemplateImage(true)
  return img
}

let cachedIcons: { outline: NativeImage; filled: NativeImage } | undefined

function _buildIconsOnce(): { outline: NativeImage; filled: NativeImage } {
  if (cachedIcons) {
    return cachedIcons
  }
  const grid = _buildSpeechBubblePixelGrid()
  cachedIcons = {
    outline: _renderPixelGridToImage({ grid, filled: false }),
    filled: _renderPixelGridToImage({ grid, filled: true })
  }
  return cachedIcons
}

export const trayIconImageUtil = {
  outlineIcon(): NativeImage {
    return _buildIconsOnce().outline
  },

  filledIcon(): NativeImage {
    return _buildIconsOnce().filled
  }
}
