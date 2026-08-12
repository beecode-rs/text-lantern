import path from 'node:path'
import { app } from 'electron'

export const pathsService = {
  projectRoot(): string {
    return process.env.APP_ROOT || process.cwd()
  },

  modelsDir(): string {
    return path.join(this.projectRoot(), 'models')
  },

  venvDir(): string {
    return path.join(this.projectRoot(), 'bin', 'venv')
  },

  piperBin(): string {
    return path.join(this.venvDir(), 'bin', 'piper')
  },

  userDataFile(name: string): string {
    return path.join(app.getPath('userData'), name)
  }
}
