type AcceleratorResult = { accel: string } | { cancel: true } | null

const MODIFIER_KEYS = ['Meta', 'Control', 'Alt', 'Shift', 'Fn']

const CODE_TO_KEY: Record<string, string> = {
  Space: 'Space',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Enter: 'Return',
  NumpadEnter: 'Return',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  CapsLock: 'Capslock',
  NumLock: 'Numlock',
  ScrollLock: 'Scrolllock',
  PrintScreen: 'PrintScreen',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/'
}

function modifiersFromEvent(e: KeyboardEvent): string[] {
  const modifiers: string[] = []
  if (e.metaKey) {
    modifiers.push('Command')
  }
  if (e.ctrlKey) {
    modifiers.push('Control')
  }
  if (e.altKey) {
    modifiers.push('Alt')
  }
  if (e.shiftKey) {
    modifiers.push('Shift')
  }
  return modifiers
}

function keyFromCode(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter !== null) {
    return letter[1]
  }
  const digit = /^Digit([0-9])$/.exec(code)
  if (digit !== null) {
    return digit[1]
  }
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) {
    return code
  }
  const mapped = CODE_TO_KEY[code]
  if (mapped !== undefined) {
    return mapped
  }
  return null
}

function sanitizedEventKey(key: string): string | null {
  if (key === 'Unidentified' || key === 'Dead' || key === 'Process') {
    return null
  }
  if (key.length !== 1) {
    return null
  }
  if (key.charCodeAt(0) > 127) {
    return null
  }
  return key.toUpperCase()
}

function baseKey(e: KeyboardEvent): string | null {
  const fromCode = keyFromCode(e.code)
  if (fromCode !== null) {
    return fromCode
  }
  return sanitizedEventKey(e.key)
}

export const acceleratorService = {
  fromKeyboardEvent(e: KeyboardEvent): AcceleratorResult {
    if (e.key === 'Escape') {
      return { cancel: true }
    }
    if (MODIFIER_KEYS.includes(e.key)) {
      return null
    }
    const modifiers = modifiersFromEvent(e)
    if (modifiers.length === 0) {
      return null
    }
    const key = baseKey(e)
    if (key === null) {
      return null
    }
    e.preventDefault()
    e.stopPropagation()
    return { accel: [...modifiers, key].join('+') }
  }
}
