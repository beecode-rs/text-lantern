import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

type AcceleratorResult = { accel: string } | { cancel: true } | null

const MODIFIER_KEYS = ['Meta', 'Control', 'Alt', 'Shift', 'Fn']

const CODE_TO_KEY = new Map<string, string>([
  ['ArrowDown', 'Down'],
  ['ArrowLeft', 'Left'],
  ['ArrowRight', 'Right'],
  ['ArrowUp', 'Up'],
  ['Backquote', '`'],
  ['Backslash', '\\'],
  ['Backspace', 'Backspace'],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['CapsLock', 'Capslock'],
  ['Comma', ','],
  ['Delete', 'Delete'],
  ['End', 'End'],
  ['Enter', 'Return'],
  ['Equal', '='],
  ['Home', 'Home'],
  ['Insert', 'Insert'],
  ['Minus', '-'],
  ['NumLock', 'Numlock'],
  ['NumpadEnter', 'Return'],
  ['PageDown', 'PageDown'],
  ['PageUp', 'PageUp'],
  ['Period', '.'],
  ['PrintScreen', 'PrintScreen'],
  ['Quote', "'"],
  ['ScrollLock', 'Scrolllock'],
  ['Semicolon', ';'],
  ['Slash', '/'],
  ['Space', 'Space'],
  ['Tab', 'Tab'],
])

export class Accelerator {
  fromKeyboardEvent(e: KeyboardEvent): AcceleratorResult {
    if (e.key === 'Escape') {
      return { cancel: true }
    }
    if (MODIFIER_KEYS.includes(e.key)) {
      return null
    }
    const modifiers = this._modifiersFromEvent(e)
    if (modifiers.length === 0) {
      return null
    }
    const key = this._baseKey(e)
    if (key === null) {
      return null
    }
    e.preventDefault()
    e.stopPropagation()

    return { accel: [...modifiers, key].join('+') }
  }

  protected _modifiersFromEvent(e: KeyboardEvent): string[] {
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

  protected _keyFromCode(code: string): string | null {
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
    const mapped = CODE_TO_KEY.get(code)
    if (mapped !== undefined) {
      return mapped
    }

    return null
  }

  protected _sanitizedEventKey(key: string): string | null {
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

  protected _baseKey(e: KeyboardEvent): string | null {
    const fromCode = this._keyFromCode(e.code)
    if (fromCode !== null) {
      return fromCode
    }

    return this._sanitizedEventKey(e.key)
  }
}

export const acceleratorSingleton = singletonPattern(() => new Accelerator())
