const detectMac = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /Mac|iPhone|iPad/.test(navigator.platform)
}

const isMac = detectMac()

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  const decimals = bytesToDecimals(value, i)
  return `${value.toFixed(decimals)} ${units[i]}`
}

function bytesToDecimals(value: number, i: number): number {
  if (value >= 10 || i === 0) {
    return 0
  }
  return 1
}

function acceleratorMap(): Record<string, string> {
  if (isMac) {
    return {
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
  }
  return {
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
}

function formatAccelerator(accel: string): string {
  const map = acceleratorMap()
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
  if (isMac) {
    joiner = ''
  }
  return parts.join(joiner)
}

export const formatService = {
  formatBytes,
  formatAccelerator
}
