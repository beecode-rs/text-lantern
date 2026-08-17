import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

const ACCELERATOR_MAP_MAC = new Map<string, string>([
  ['Alt', '⌥'],
  ['Cmd', '⌘'],
  ['CmdOrCtrl', '⌘'],
  ['Command', '⌘'],
  ['CommandOrControl', '⌘'],
  ['Control', '⌃'],
  ['Ctrl', '⌃'],
  ['Meta', '⌘'],
  ['Option', '⌥'],
  ['Shift', '⇧'],
  ['Super', '⌘'],
])

const ACCELERATOR_MAP_DEFAULT = new Map<string, string>([
  ['Alt', 'Alt'],
  ['Cmd', 'Win'],
  ['CmdOrCtrl', 'Ctrl'],
  ['Command', 'Win'],
  ['CommandOrControl', 'Ctrl'],
  ['Control', 'Ctrl'],
  ['Ctrl', 'Ctrl'],
  ['Meta', 'Win'],
  ['Option', 'Alt'],
  ['Shift', 'Shift'],
  ['Super', 'Win'],
])

export class Format {
  protected readonly _isMac: boolean

  constructor() {
    this._isMac = this._isMacPlatform()
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB']
    const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
    const value = bytes / Math.pow(1024, unitIndex)
    const decimals = this._bytesToDecimals({ unitIndex, value })

    return `${value.toFixed(decimals)} ${units[unitIndex]}`
  }

  formatAccelerator(accel: string): string {
    const map = this._acceleratorMap()
    const parts = accel.split('+').map((part) => {
      const key = part.trim()
      const mapped = map.get(key)
      if (mapped !== undefined) {
        return mapped
      }
      if (key.length === 1) {
        return key.toUpperCase()
      }

      return key
    })
    let joiner = '+'
    if (this._isMac) {
      joiner = ''
    }

    return parts.join(joiner)
  }

  protected _isMacPlatform(): boolean {
    if (typeof navigator === 'undefined') {
      return false
    }

    return /Mac|iPhone|iPad/.test(navigator.platform)
  }

  protected _bytesToDecimals(params: { value: number; unitIndex: number }): number {
    if (params.value >= 10 || params.unitIndex === 0) {
      return 0
    }

    return 1
  }

  protected _acceleratorMap(): Map<string, string> {
    if (this._isMac) {
      return ACCELERATOR_MAP_MAC
    }

    return ACCELERATOR_MAP_DEFAULT
  }
}

export const formatSingleton = singletonPattern(() => new Format())
