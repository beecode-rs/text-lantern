import { nativeImage, type NativeImage } from 'electron'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

const ICON_WIDTH = 28
const ICON_HEIGHT = 20

const BUBBLE = { x0: 3, y0: 4, x1: 14, y1: 12, r: 2 }
const TAIL = { x0: 4, slope: 1.2, y0: 11, y1: 15, cap: 8 }
const WAVES = { cx: 14, cy: 8, radii: [2.5, 4.5, 6.5], angleMaxDeg: 50, tolerance: 0.8 }

export class TrayIconImageUtil {
  private _cachedIcons: { outline: NativeImage; filled: NativeImage } | undefined

  public outlineIcon(): NativeImage {
    return this._buildIconsOnce().outline
  }

  public filledIcon(): NativeImage {
    return this._buildIconsOnce().filled
  }

  protected _isPixelInsideSpeechBubble(px: number, py: number): boolean {
    const { x0, y0, x1, y1, r } = BUBBLE
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
    return px >= x0 && px <= x1 && py >= y0 && py <= y1 && dx * dx + dy * dy <= r * r
  }

  protected _isPixelInsideTail(px: number, py: number): boolean {
    const { x0, slope, y0, y1, cap } = TAIL
    if (py < y0 || py > y1) {
      return false
    }
    const xLimit = Math.min(x0 + (py - y0) * slope, cap)
    return px >= x0 && px <= xLimit
  }

  protected _isPixelOnWave(px: number, py: number): boolean {
    const { cx, cy, radii, angleMaxDeg, tolerance } = WAVES
    const ddx = px - cx
    if (ddx < 0) {
      return false
    }
    const ddy = py - cy
    const dist = Math.hypot(ddx, ddy)
    const angleDeg = Math.abs((Math.atan2(ddy, ddx) * 180) / Math.PI)
    if (angleDeg > angleMaxDeg) {
      return false
    }
    return radii.some((ri) => {
      return Math.abs(dist - ri) <= tolerance
    })
  }

  protected _isPixelInsideMark(px: number, py: number): boolean {
    return (
      this._isPixelInsideSpeechBubble(px, py) ||
      this._isPixelInsideTail(px, py) ||
      this._isPixelOnWave(px, py)
    )
  }

  protected _buildMarkPixelGrid(): Uint8Array {
    return Uint8Array.from({ length: ICON_WIDTH * ICON_HEIGHT }, (_unused, i) => {
      const x = i % ICON_WIDTH
      const y = Math.floor(i / ICON_WIDTH)
      if (this._isPixelInsideMark(x, y)) {
        return 1
      }
      return 0
    })
  }

  protected _pixelIndexInGrid(x: number, y: number): number {
    return y * ICON_WIDTH + x
  }

  protected _isGridPixelOn(grid: Uint8Array, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= ICON_WIDTH || y >= ICON_HEIGHT) {
      return false
    }
    return grid[this._pixelIndexInGrid(x, y)] === 1
  }

  protected _isPixelOnShapeEdge(grid: Uint8Array, x: number, y: number): boolean {
    return (
      !this._isGridPixelOn(grid, x - 1, y) ||
      !this._isGridPixelOn(grid, x + 1, y) ||
      !this._isGridPixelOn(grid, x, y - 1) ||
      !this._isGridPixelOn(grid, x, y + 1)
    )
  }

  protected _renderPixelGridToImage(params: { grid: Uint8Array; filled: boolean }): NativeImage {
    const { grid, filled } = params
    const buf = Buffer.alloc(ICON_WIDTH * ICON_HEIGHT * 4)
    Array.from({ length: ICON_WIDTH * ICON_HEIGHT }, (_unused, i) => {
      const x = i % ICON_WIDTH
      const y = Math.floor(i / ICON_WIDTH)
      const o = i * 4
      const pixelIsOn = this._isGridPixelOn(grid, x, y)
      let lit: boolean
      if (filled) {
        lit = pixelIsOn
      } else {
        lit = pixelIsOn && this._isPixelOnShapeEdge(grid, x, y)
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
      width: ICON_WIDTH,
      height: ICON_HEIGHT
    })
    img.setTemplateImage(true)
    return img
  }

  protected _buildIconsOnce(): { outline: NativeImage; filled: NativeImage } {
    if (this._cachedIcons) {
      return this._cachedIcons
    }
    const grid = this._buildMarkPixelGrid()
    this._cachedIcons = {
      outline: this._renderPixelGridToImage({ grid, filled: false }),
      filled: this._renderPixelGridToImage({ grid, filled: true })
    }
    return this._cachedIcons
  }
}

export const trayIconImageUtilSingleton = singletonPattern(() => new TrayIconImageUtil())
