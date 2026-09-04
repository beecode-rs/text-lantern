import { app } from 'electron'
import path from 'node:path'

export const pathUtil = {
  _bundledPath(params: { segments: string[] }): string {
    return path.join(this.bundledRoot(), ...params.segments)
  },

  _venvBinFile(params: { name: string }): string {
    if (process.platform === 'win32') {
      return `${params.name}.exe`
    }

    return params.name
  },

  appIcon(): string {
    return this._bundledPath({ segments: ['resource', 'icon.png'] })
  },

  bundledRoot(): string {
    if (app.isPackaged) {
      return app.getAppPath()
    }

    return this.projectRoot()
  },

  cosyvoiceBinDir(): string {
    return path.join(this.dataRoot(), 'bin', 'cosyvoice')
  },

  cosyvoiceCliBin(): string {
    return path.join(this.cosyvoiceBinDir(), 'cosyvoice-cli')
  },

  cosyvoiceFrontendDir(): string {
    return path.join(this.modelsDir(), 'cosyvoice', 'frontend')
  },

  cosyvoiceModelDir(): string {
    return path.join(this.modelsDir(), 'cosyvoice', 'model')
  },

  cosyvoiceServerBin(): string {
    return path.join(this.cosyvoiceBinDir(), 'cosyvoice-server')
  },

  cosyvoiceVoicesDir(): string {
    return path.join(this.modelsDir(), 'cosyvoice', 'voices')
  },

  dataRoot(): string {
    if (app.isPackaged) {
      return app.getPath('userData')
    }

    return this.projectRoot()
  },

  kokoroModelDir(): string {
    return path.join(this.modelsDir(), 'kokoro', 'model')
  },

  kokoroVoicesDir(): string {
    return path.join(this.modelsDir(), 'kokoro', 'voices')
  },

  modelsDir(): string {
    return path.join(this.dataRoot(), 'models')
  },

  piperBin(): string {
    return path.join(this.venvBinDir(), this._venvBinFile({ name: 'piper' }))
  },

  piperServerScript(): string {
    const asarPath = this._bundledPath({ segments: ['resource', 'script', 'piper_server.py'] })
    if (!app.isPackaged) {
      return asarPath
    }

    return asarPath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`)
  },

  projectRoot(): string {
    const envRoot = process.env.APP_ROOT
    if (envRoot) {
      return envRoot
    }

    return process.cwd()
  },

  pythonCommand(): string {
    if (process.platform === 'win32') {
      return 'python'
    }

    return 'python3'
  },

  userDataFile(name: string): string {
    return path.join(app.getPath('userData'), name)
  },

  venvBinDir(): string {
    if (process.platform === 'win32') {
      return path.join(this.venvDir(), 'Scripts')
    }

    return path.join(this.venvDir(), 'bin')
  },

  venvDir(): string {
    return path.join(this.dataRoot(), 'bin', 'venv')
  },

  venvPip(): string {
    return path.join(this.venvBinDir(), this._venvBinFile({ name: 'pip' }))
  },

  venvPython(): string {
    return path.join(this.venvBinDir(), this._venvBinFile({ name: 'python' }))
  },
}
