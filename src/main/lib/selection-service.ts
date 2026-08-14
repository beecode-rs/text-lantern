import { execFile } from 'node:child_process'

import { clipboard } from 'electron'

import { APP_NAME, constant } from '@src/main/util/constants'

const COPY_MAX_POLLS = Math.round(
  constant().textSelection.copyTimeoutMs / constant().textSelection.copyPollStepMs
)
const COPY_POLL_STEP_SECONDS = constant().textSelection.copyPollStepMs / 1000

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

export class SelectionService {
  public async grab(): Promise<string> {
    const saved = clipboard.readText()

    if (process.platform === 'darwin') {
      try {
        const copied = await this._copySelectionAndWait()
        if (!copied) {
          this._restoreClipboard({ saved })
          return ''
        }
      } catch (error) {
        const stderr = this._stderrFrom(error)
        if (this._isPermissionDenied({ stderr })) {
          throw new Error(this._permissionDeniedMessage())
        }
        throw new Error(this._grabFailureMessage({ stderr }))
      }
    }

    const selection = clipboard.readText()
    this._restoreClipboard({ saved })
    return selection.trim()
  }

  protected _runAppleScript(params: { source: string }): Promise<string> {
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

  protected _restoreClipboard(params: { saved: string }): void {
    if (params.saved) {
      clipboard.writeText(params.saved)
    }
  }

  protected _stderrFrom(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  protected _isPermissionDenied(params: { stderr: string }): boolean {
    const haystack = params.stderr.toLowerCase()
    return constant().textSelection.permissionDeniedMarkers.some((marker) => {
      return haystack.includes(marker)
    })
  }

  protected _permissionDeniedMessage(): string {
    return `${APP_NAME} is not allowed to copy the selection. Open System Settings → Privacy & Security → Automation (and Accessibility), enable ${APP_NAME}, then press the shortcut again.`
  }

  protected _grabFailureMessage(params: { stderr: string }): string {
    return `${APP_NAME} could not copy the selection. ${params.stderr}`
  }

  protected async _copySelectionAndWait(): Promise<boolean> {
    const stdout = await this._runAppleScript({ source: COPY_SELECTION_SCRIPT })
    return stdout.trim() === 'true'
  }
}

