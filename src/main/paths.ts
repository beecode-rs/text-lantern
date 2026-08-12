import path from 'node:path'
import { app } from 'electron'

function projectRoot(): string {
  return process.env.APP_ROOT || process.cwd()
}

function modelsDir(): string {
  return path.join(projectRoot(), 'models')
}

function venvDir(): string {
  return path.join(projectRoot(), 'bin', 'venv')
}

function piperBin(): string {
  return path.join(venvDir(), 'bin', 'piper')
}

function userDataFile(name: string): string {
  return path.join(app.getPath('userData'), name)
}

export const pathsService = {
  projectRoot,
  modelsDir,
  venvDir,
  piperBin,
  userDataFile
}
