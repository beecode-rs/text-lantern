import { app } from 'electron'
import path from 'node:path'

export const pathUtil = {
  modelsDir(): string {
    return path.join(this.projectRoot(), 'models')
  },

  piperBin(): string {
    return path.join(this.venvDir(), 'bin', 'piper')
  },

  piperServerScript(): string {
    return path.join(this.projectRoot(), 'resource', 'script', 'piper_server.py')
  },

  projectRoot(): string {
    const envRoot = process.env.APP_ROOT
    if (envRoot) {
      return envRoot
    }

    return process.cwd()
  },

  userDataFile(name: string): string {
    return path.join(app.getPath('userData'), name)
  },

  venvDir(): string {
    return path.join(this.projectRoot(), 'bin', 'venv')
  },

  venvPython(): string {
    return path.join(this.venvDir(), 'bin', 'python')
  },
}
