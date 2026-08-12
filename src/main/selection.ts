import { clipboard } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(exec)

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function grabSelection(): Promise<string> {
  const saved = clipboard.readText()

  if (process.platform === 'darwin') {
    try {
      await pexec(
        `osascript -e 'tell application "System Events" to keystroke "c" using command down'`
      )
      await delay(180)
    } catch {
      // TODO: Remove when Linux/Windows selection grab lands — fall through with the existing clipboard.
    }
  }

  const selection = clipboard.readText()
  if (saved) {
    clipboard.writeText(saved)
  }
  return selection.trim()
}
