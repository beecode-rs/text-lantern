import path from 'node:path'
import { app } from 'electron'

function projectRoot(): string {
  return process.env.APP_ROOT || process.cwd()
}

function modelsDir(): string {
  return path.join(projectRoot(), 'models')
}

function piperBin(): string {
  return path.join(projectRoot(), 'bin', 'venv', 'bin', 'piper')
}

function installScript(): string {
  return path.join(projectRoot(), 'install.sh')
}

function userDataFile(name: string): string {
  return path.join(app.getPath('userData'), name)
}

export const pathsService = {
  projectRoot,
  modelsDir,
  piperBin,
  installScript,
  userDataFile
}
