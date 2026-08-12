import { clipboard } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(exec)

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

export const selectionService = {
  async grab(): Promise<string> {
    const saved = clipboard.readText()

    if (process.platform === 'darwin') {
      try {
        await _triggerMacOsCopyShortcut()
        await _delayMs(180)
      } catch {
        // TODO: Remove when Linux/Windows selection grab lands — fall through with the existing clipboard.
      }
    }

    const selection = clipboard.readText()
    _restoreClipboard({ saved })
    return selection.trim()
  }
}
