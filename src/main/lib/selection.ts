import { typeUtil } from '@beecode/msh-util/type-util'
import { clipboard, systemPreferences } from 'electron'
import { execFile } from 'node:child_process'

import { APP_NAME, constant } from '#src/main/util/constants'
import { MacPermission } from '#src/shared/types'

const COPY_MAX_POLLS = Math.round(constant().textSelection.copyTimeoutMs / constant().textSelection.copyPollStepMs)
const COPY_POLL_STEP_SECONDS = constant().textSelection.copyPollStepMs / 1000

const COPY_SELECTION_SCRIPT = `use framework "AppKit"
use scripting additions
set pb to current application's NSPasteboard's generalPasteboard()
set priorCount to (pb's changeCount()) as integer
tell application "System Events" to keystroke "c" using command down
set didChange to false
repeat ${String(COPY_MAX_POLLS)} times
	if ((pb's changeCount()) as integer) > priorCount then
		set didChange to true
		exit repeat
	end if
	delay ${String(COPY_POLL_STEP_SECONDS)}
end repeat
return didChange as string`

const WARMUP_SCRIPT = `use framework "AppKit"
use scripting additions
tell application "System Events" to get name of first application process`

export class SelectionPermissionError extends Error {
  readonly missingMacPermissions: MacPermission[]

  constructor(params: { message: string; missingMacPermissions: MacPermission[] }) {
    const { message, missingMacPermissions } = params
    super(message)
    this.name = 'SelectionPermissionError'
    this.missingMacPermissions = missingMacPermissions
  }
}

export class Selection {
  async grab(): Promise<string> {
    if (process.platform === 'darwin') {
      return this._grabSelectionMac()
    }
    if (process.platform === 'linux') {
      return this._grabSelectionLinux()
    }

    return (await clipboard.readText()).trim()
  }

  async warmUp(): Promise<void> {
    await this._runAppleScript({ source: WARMUP_SCRIPT })
  }

  protected async _grabSelectionMac(): Promise<string> {
    const saved = await clipboard.readText()

    try {
      const isCopied = await this._copySelectionAndWait()
      if (!isCopied) {
        await this._restoreClipboard({ saved })

        return ''
      }
    } catch (error) {
      const stderr = this._stderrFrom(error)
      if (this._isPermissionDenied({ stderr })) {
        const permissionError = await this._createPermissionError()
        throw permissionError
      }
      throw new Error(this._grabFailureMessage({ stderr }))
    }

    const selection = await clipboard.readText()
    await this._restoreClipboard({ saved })

    return selection.trim()
  }

  protected async _grabSelectionLinux(): Promise<string> {
    const primarySelection = await clipboard.selection.readText()
    if (primarySelection !== '') {
      return primarySelection.trim()
    }

    return (await clipboard.readText()).trim()
  }

  async checkMissingPermissions(): Promise<MacPermission[]> {
    if (process.platform !== 'darwin') {
      return []
    }
    const accessibility = this._probeAccessibility()
    const automation = await this._probeAutomation()

    return [accessibility, automation].filter((pane): pane is MacPermission => {
      return pane !== undefined
    })
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

  protected async _restoreClipboard(params: { saved: string }): Promise<void> {
    if (params.saved) {
      await clipboard.writeText(params.saved)
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

  protected _permissionDeniedMessage(params: { missingMacPermissions: MacPermission[] }): string {
    const { missingMacPermissions } = params
    const panes = this._panesForMessage({ missingMacPermissions })
    const instructions = panes.map((pane) => {
      return this._permissionInstruction({ pane })
    })

    return [
      `${APP_NAME} is not allowed to copy the selection.`,
      ...instructions,
      'Then press the shortcut again.',
    ].join(' ')
  }

  protected _panesForMessage(params: { missingMacPermissions: MacPermission[] }): MacPermission[] {
    const { missingMacPermissions } = params
    if (missingMacPermissions.length > 0) {
      return missingMacPermissions
    }

    return [MacPermission.ACCESSIBILITY, MacPermission.AUTOMATION]
  }

  protected _permissionInstruction(params: { pane: MacPermission }): string {
    const { pane } = params
    switch (pane) {
      case MacPermission.ACCESSIBILITY: {
        return `Enable ${APP_NAME} in System Settings → Privacy & Security → Accessibility.`
      }
      case MacPermission.AUTOMATION: {
        return `In System Settings → Privacy & Security → Automation → ${APP_NAME}, enable System Events.`
      }
      default: {
        throw typeUtil.exhaustiveError('unknown mac permission', pane)
      }
    }
  }

  protected _probeAccessibility(): MacPermission | undefined {
    if (systemPreferences.isTrustedAccessibilityClient(false)) {
      return undefined
    }

    return MacPermission.ACCESSIBILITY
  }

  protected async _probeAutomation(): Promise<MacPermission | undefined> {
    try {
      await this._runAppleScript({ source: WARMUP_SCRIPT })

      return undefined
    } catch (error) {
      if (!this._isPermissionDenied({ stderr: this._stderrFrom(error) })) {
        return undefined
      }

      return MacPermission.AUTOMATION
    }
  }

  protected async _createPermissionError(): Promise<SelectionPermissionError> {
    const missingMacPermissions = await this.checkMissingPermissions()

    return new SelectionPermissionError({
      message: this._permissionDeniedMessage({ missingMacPermissions }),
      missingMacPermissions,
    })
  }

  protected _grabFailureMessage(params: { stderr: string }): string {
    return `${APP_NAME} could not copy the selection. ${params.stderr}`
  }

  protected async _copySelectionAndWait(): Promise<boolean> {
    const stdout = await this._runAppleScript({ source: COPY_SELECTION_SCRIPT })

    return stdout.trim() === 'true'
  }
}
