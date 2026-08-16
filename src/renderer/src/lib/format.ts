import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

const ACCELERATOR_MAP_MAC: Record<string, string> = {
  CommandOrControl: '⌘',
  CmdOrCtrl: '⌘',
  Command: '⌘',
  Cmd: '⌘',
  Control: '⌃',
  Ctrl: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Super: '⌘',
  Meta: '⌘'
}

const ACCELERATOR_MAP_DEFAULT: Record<string, string> = {
  CommandOrControl: 'Ctrl',
  CmdOrCtrl: 'Ctrl',
  Command: 'Win',
  Cmd: 'Win',
  Super: 'Win',
  Meta: 'Win',
  Control: 'Ctrl',
  Ctrl: 'Ctrl',
  Alt: 'Alt',
  Option: 'Alt',
  Shift: 'Shift'
}

export class Format {
  protected readonly _isMac: boolean

  public constructor() {
    this._isMac = this._detectMac()
  }

  public formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
      return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB']
    const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
    const value = bytes / Math.pow(1024, unitIndex)
    const decimals = this._bytesToDecimals({ value, unitIndex })
    return `${value.toFixed(decimals)} ${units[unitIndex]}`
  }

  public formatAccelerator(accel: string): string {
    const map = this._acceleratorMap()
    const parts = accel.split('+').map((part) => {
      const key = part.trim()
      if (map[key]) {
        return map[key]
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

  protected _detectMac(): boolean {
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

  protected _acceleratorMap(): Record<string, string> {
    if (this._isMac) {
      return ACCELERATOR_MAP_MAC
    }
    return ACCELERATOR_MAP_DEFAULT
  }
}

export const formatSingleton = singletonPattern(() => new Format())
