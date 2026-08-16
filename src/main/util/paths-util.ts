import path from 'node:path'
import { app } from 'electron'

export const pathsUtil = {
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

  venvPython(): string {
    return path.join(this.venvDir(), 'bin', 'python')
  },

  piperServerScript(): string {
    return path.join(this.projectRoot(), 'resource', 'script', 'piper_server.py')
  },

  userDataFile(name: string): string {
    return path.join(app.getPath('userData'), name)
  }
}
