import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type NativeImage, nativeImage } from 'electron'

const ICON_WIDTH = 28
const ICON_HEIGHT = 20
const MARK_HORIZONTAL_STRETCH = 1.18
const SAMPLES_PER_AXIS = 3

const ORB = { r: 2.6, x0: 5, x1: 15.5, y0: 3.3, y1: 15.2 }
const TAIL = { x0: 8.1, xb: 8.3, xt: 11.2, y0: 14.9, y1: 18.1 }
const ARCS = { angleMaxDeg: 44, cx: 12, cy: 9.65, halfThickness: 0.68, radii: [6.15, 8.45, 10.75] }

export class TrayIconImageUtil {
  protected _cachedIcons: { outline: NativeImage; filled: NativeImage } | undefined

  outlineIcon(): NativeImage {
    return this._buildIconsOnce().outline
  }

  filledIcon(): NativeImage {
    return this._buildIconsOnce().filled
  }

  protected _isPointInsideOrb(x: number, y: number): boolean {
    const { r, x0, x1, y0, y1 } = ORB
    if (x < x0 || x > x1 || y < y0 || y > y1) {
      return false
    }
    const cornerX = Math.min(Math.max(x, x0 + r), x1 - r)
    const cornerY = Math.min(Math.max(y, y0 + r), y1 - r)
    const dx = x - cornerX
    const dy = y - cornerY

    return dx * dx + dy * dy <= r * r
  }

  protected _isPointInsideTail(x: number, y: number): boolean {
    const { x0, xb, xt, y0, y1 } = TAIL
    if (y < y0 || y > y1) {
      return false
    }
    const xMax = xt + ((y - y0) * (xb - xt)) / (y1 - y0)

    return x >= x0 && x <= xMax
  }

  protected _isPointOnArc(x: number, y: number): boolean {
    const { angleMaxDeg, cx, cy, halfThickness, radii } = ARCS
    const dx = x - cx
    if (dx < 0) {
      return false
    }
    const dy = y - cy
    const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI)
    if (angleDeg > angleMaxDeg) {
      return false
    }
    const dist = Math.hypot(dx, dy)

    return radii.some((radius) => {
      return Math.abs(dist - radius) <= halfThickness
    })
  }

  protected _isPointInsideMark(x: number, y: number): boolean {
    const canvasCenterX = ICON_WIDTH / 2
    const shapeX = canvasCenterX + (x - canvasCenterX) / MARK_HORIZONTAL_STRETCH

    return this._isPointInsideOrb(shapeX, y) || this._isPointInsideTail(shapeX, y) || this._isPointOnArc(shapeX, y)
  }

  protected _isPixelInsideMark(px: number, py: number): boolean {
    const sampleTotal = SAMPLES_PER_AXIS * SAMPLES_PER_AXIS
    const samples = Array.from({ length: sampleTotal }, (_unused, i) => {
      const sampleX = px + ((i % SAMPLES_PER_AXIS) + 0.5) / SAMPLES_PER_AXIS
      const sampleY = py + (Math.floor(i / SAMPLES_PER_AXIS) + 0.5) / SAMPLES_PER_AXIS
      if (this._isPointInsideMark(sampleX, sampleY)) {
        return 1
      }

      return 0
    })
    const hitCount = samples.reduce<number>((acc, hit) => {
      return acc + hit
    }, 0)

    return hitCount * 2 >= sampleTotal
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
      height: ICON_HEIGHT,
      width: ICON_WIDTH,
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
      filled: this._renderPixelGridToImage({ filled: true, grid }),
      outline: this._renderPixelGridToImage({ filled: false, grid }),
    }

    return this._cachedIcons
  }
}

export const trayIconImageUtilSingleton = singletonPattern(() => new TrayIconImageUtil())
