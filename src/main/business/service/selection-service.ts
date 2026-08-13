import { clipboard } from 'electron'
import { execFile } from 'node:child_process'
import { APP_NAME } from '@src/main/util/constants'

const COPY_TIMEOUT_MS = 1000
const COPY_POLL_STEP_MS = 10
const COPY_MAX_POLLS = Math.round(COPY_TIMEOUT_MS / COPY_POLL_STEP_MS)
const COPY_POLL_STEP_SECONDS = COPY_POLL_STEP_MS / 1000
const PERMISSION_DENIED_MARKERS = ['-1743', 'not authorized', 'assistive', 'apple events', 'not allowed']

const COPY_SELECTION_SCRIPT = `use framework "AppKit"
use scripting additions
set pb to current application's NSPasteboard's generalPasteboard()
set priorCount to (pb's changeCount()) as integer
tell application "System Events" to keystroke "c" using command down
set didChange to false
repeat ${COPY_MAX_POLLS} times
	if ((pb's changeCount()) as integer) > priorCount then
		set didChange to true
		exit repeat
	end if
	delay ${COPY_POLL_STEP_SECONDS}
end repeat
return didChange as string`

function _runAppleScript(params: { source: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile('osascript', [], (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
        return
      }
      resolve(stdout)
    })
    proc.stdin?.end(params.source)
  })
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

async function _copySelectionAndWait(): Promise<boolean> {
  const stdout = await _runAppleScript({ source: COPY_SELECTION_SCRIPT })
  return stdout.trim() === 'true'
}

export const selectionService = {
  async grab(): Promise<string> {
    const saved = clipboard.readText()

    if (process.platform === 'darwin') {
      try {
        const copied = await _copySelectionAndWait()
        if (!copied) {
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
