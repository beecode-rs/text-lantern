import { clipboard } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { APP_NAME } from '@src/main/util/constants'

const pexec = promisify(exec)

const COPY_TIMEOUT_MS = 1000
const COPY_POLL_INTERVAL_MS = 40
const COPY_MAX_ATTEMPTS = Math.ceil(COPY_TIMEOUT_MS / COPY_POLL_INTERVAL_MS)
const PERMISSION_DENIED_MARKERS = ['-1743', 'not authorized', 'assistive', 'apple events', 'not allowed']

function _delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function _triggerMacOsCopyShortcut(): Promise<void> {
  await pexec(
    `osascript -e 'tell application "System Events" to keystroke "c" using command down'`
  )
}

function _restoreClipboard(params: { saved: string }): void {
  if (params.saved) {
    clipboard.writeText(params.saved)
  }
}

function _stderrFrom(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function _isPermissionDenied(params: { stderr: string }): boolean {
  const haystack = params.stderr.toLowerCase()
  return PERMISSION_DENIED_MARKERS.some((marker) => {
    return haystack.includes(marker)
  })
}

function _permissionDeniedMessage(): string {
  return `${APP_NAME} is not allowed to copy the selection. Open System Settings → Privacy & Security → Automation (and Accessibility), enable ${APP_NAME}, then press the shortcut again.`
}

function _grabFailureMessage(params: { stderr: string }): string {
  return `${APP_NAME} could not copy the selection. ${params.stderr}`
}

async function _waitForClipboardChange(params: { before: string; attempts: number }): Promise<boolean> {
  if (params.attempts <= 0) {
    return false
  }
  if (clipboard.readText() !== params.before) {
    return true
  }
  await _delayMs(COPY_POLL_INTERVAL_MS)
  return _waitForClipboardChange({ before: params.before, attempts: params.attempts - 1 })
}

export const selectionService = {
  async grab(): Promise<string> {
    const saved = clipboard.readText()

    if (process.platform === 'darwin') {
      try {
        await _triggerMacOsCopyShortcut()
        const changed = await _waitForClipboardChange({ before: saved, attempts: COPY_MAX_ATTEMPTS })
        if (!changed) {
          _restoreClipboard({ saved })
          return ''
        }
      } catch (error) {
        const stderr = _stderrFrom(error)
        if (_isPermissionDenied({ stderr })) {
          throw new Error(_permissionDeniedMessage())
        }
        throw new Error(_grabFailureMessage({ stderr }))
      }
    }

    const selection = clipboard.readText()
    _restoreClipboard({ saved })
    return selection.trim()
  }
}
