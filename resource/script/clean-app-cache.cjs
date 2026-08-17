const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const APP_NAME = 'Text Lantern'
const projectRoot = path.resolve(__dirname, '..', '..')

class CleanAppCache {
  clean = () => {
    const appDataDir = this._resolveAppDataDir()
    const cleanTargets = [
      { label: 'app data', dirPath: path.join(appDataDir, APP_NAME) },
      { label: 'voice models', dirPath: path.join(projectRoot, 'models') },
      { label: 'piper venv', dirPath: path.join(projectRoot, 'bin', 'venv') }
    ]

    cleanTargets.forEach((cleanTarget) => {
      return this._removeCleanTarget(cleanTarget)
    })
  }

  _resolveAppDataDir = () => {
    switch (process.platform) {
      case 'darwin': {
        return path.join(os.homedir(), 'Library', 'Application Support')
      }
      case 'win32': {
        return process.env.APPDATA
      }
      case 'linux': {
        return path.join(os.homedir(), '.config')
      }
      default: {
        throw new Error(`unsupported platform: ${process.platform}`)
      }
    }
  }

  _removeCleanTarget = (params) => {
    try {
      fs.rmSync(params.dirPath, { recursive: true, force: true })
      console.log(`removed ${params.label}: ${params.dirPath}`)
    } catch (error) {
      console.error(`failed to remove ${params.label}: ${params.dirPath} — ${error.message}`)
      console.error('Is the app still running? Quit it and re-run pnpm run clean-app-cache.')
      process.exitCode = 1
    }
  }
}

new CleanAppCache().clean()
