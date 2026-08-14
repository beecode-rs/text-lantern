import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { constant } from '@src/main/util/constants'
import { pathsService } from '@src/main/util/paths-service'
import { languageServiceSingleton } from '@src/shared/language/language-service'
import type { RemoteVoice } from '@src/shared/types'

interface HfTreeEntry {
  type: 'file' | 'directory'
  path: string
  size: number
  lfs?: { size: number }
}

export class PiperEngineService {
  public isEngineInstalled(): boolean {
    try {
      return fs.existsSync(pathsService.piperBin())
    } catch {
      return false
    }
  }

  public async installEngine(params: { onLog: (line: string) => void }): Promise<boolean> {
    const log = params.onLog

    const pythonOk = await this._ensurePythonVersionMeetsMinimum({ onLog: log })
    if (!pythonOk) {
      return false
    }

    const installed = await this._createVenvAndInstallPiperIfMissing({ onLog: log })
    if (!installed) {
      return false
    }

    await this._downloadEachMissingDefaultVoice({ onLog: log })

    await this._verifySynthesisProducesAudio({ onLog: log })
    log('[done]')
    return this.isEngineInstalled()
  }

  public async downloadVoice(params: {
    name: string
    onProgress: (p: number) => void
  }): Promise<void> {
    fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
    const prefix = this._resolveVoiceDownloadUrlPrefix({ name: params.name })
    const files = [
      { ext: 'onnx', weight: 0.97 },
      { ext: 'onnx.json', weight: 0.03 }
    ]
    let base = 0
    await files.reduce(async (acc, f) => {
      await acc
      const dest = path.join(pathsService.modelsDir(), `${params.name}.${f.ext}`)
      const url = `${prefix}/${params.name}.${f.ext}`
      await this._downloadFileWithProgress({
        url,
        dest,
        onProgress: (p) => {
          params.onProgress(base + p * f.weight)
        }
      })
      base += f.weight
      params.onProgress(base)
    }, Promise.resolve())
    params.onProgress(1)
  }

  public async searchVoices(params: { query: string }): Promise<RemoteVoice[]> {
    const code = this._resolveLangCode({ query: params.query })
    if (!code) {
      return []
    }
    const url = `${constant().piperEngine.piperVoicesTreeApiUrl}/${encodeURIComponent(code)}?recursive=true`
    let res: Response
    try {
      res = await fetch(url)
    } catch {
      return []
    }
    if (!res.ok) {
      return []
    }
    const entries = (await res.json()) as HfTreeEntry[]
    return entries
      .filter((entry) => {
        return entry.path.startsWith(`${code}/`)
      })
      .map((entry) => {
        return this._entryToRemoteVoice({ entry })
      })
      .filter((voice): voice is RemoteVoice => {
        return voice !== null
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name)
      })
  }

  protected _splitVoiceNameIntoParts(name: string): {
    lang: string
    langRegion: string
    voice: string
    quality: string
  } {
    const dash = name.indexOf('-')
    let langRegion = name
    let rest = ''
    if (dash >= 0) {
      langRegion = name.slice(0, dash)
      rest = name.slice(dash + 1)
    }
    const lastDash = rest.lastIndexOf('-')
    let voice = rest
    let quality = ''
    if (lastDash >= 0) {
      voice = rest.slice(0, lastDash)
      quality = rest.slice(lastDash + 1)
    }
    const lang = langRegion.split('_')[0] || langRegion
    return { lang, langRegion, voice, quality }
  }

  protected _resolveVoiceDownloadUrlPrefix(params: { name: string }): string {
    if (params.name === constant().piperEngine.serbianVoiceName) {
      return constant().piperEngine.serbianVoicesRepoUrl
    }
    const { lang, langRegion, voice, quality } = this._splitVoiceNameIntoParts(params.name)
    return `${constant().piperEngine.piperVoicesBaseUrl}/${lang}/${langRegion}/${voice}/${quality}`
  }

  protected _resolveLangCode(params: { query: string }): string | null {
    const q = params.query.trim().toLowerCase()
    if (!q) {
      return null
    }
    const byCode = languageServiceSingleton().list().find((language) => {
      return language.code === q
    })
    if (byCode) {
      return byCode.code
    }
    const byName = languageServiceSingleton().list().find((language) => {
      return language.name.toLowerCase() === q
    })
    if (byName) {
      return byName.code
    }
    if (/^[a-z]{1,3}$/.test(q)) {
      return q
    }
    return null
  }

  protected _entryToRemoteVoice(params: { entry: HfTreeEntry }): RemoteVoice | null {
    const { entry } = params
    if (entry.type !== 'file' || !entry.path.endsWith('.onnx')) {
      return null
    }
    const fileName = entry.path.slice(entry.path.lastIndexOf('/') + 1)
    const name = fileName.slice(0, -'.onnx'.length)
    const { lang, quality } = this._splitVoiceNameIntoParts(name)
    return {
      name,
      lang,
      quality,
      sizeBytes: entry.lfs?.size ?? entry.size
    }
  }

  protected _venvPipBinPath(): string {
    return path.join(pathsService.venvDir(), 'bin', 'pip')
  }

  protected _forwardCommandOutputLineByLine(params: {
    output: Buffer
    onLog?: (line: string) => void
  }): void {
    params.output
      .toString()
      .split('\n')
      .forEach((line) => {
        if (line.trim()) {
          params.onLog?.(line)
        }
      })
  }

  protected _runCommandStreamingOutput(params: {
    cmd: string
    args: string[]
    env?: NodeJS.ProcessEnv
    onLog?: (line: string) => void
  }): Promise<number> {
    return new Promise((resolve) => {
      const child: ChildProcess = spawn(params.cmd, params.args, {
        cwd: pathsService.projectRoot(),
        env: { ...process.env, ...(params.env ?? {}) }
      })
      const onStdout = (d: Buffer): void => {
        this._forwardCommandOutputLineByLine({ output: d, onLog: params.onLog })
      }
      child.stdout?.on('data', onStdout)
      child.stderr?.on('data', onStdout)
      child.on('exit', (code) => {
        resolve(code ?? -1)
      })
      child.on('error', (err) => {
        params.onLog?.(String(err))
        resolve(-1)
      })
    })
  }

  protected _wavFileHasAudio(params: { wavPath: string }): boolean {
    try {
      return fs.existsSync(params.wavPath) && fs.statSync(params.wavPath).size > 0
    } catch {
      return false
    } finally {
      try {
        fs.rmSync(params.wavPath, { force: true })
      } catch {}
    }
  }

  protected _verifyVoiceProducesAudio(voice: string): Promise<boolean> {
    return new Promise((resolve) => {
      const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
      const json = path.join(pathsService.modelsDir(), `${voice}.onnx.json`)
      if (!fs.existsSync(onnx) || !fs.existsSync(json)) {
        resolve(false)
        return
      }
      const wav = path.join(os.tmpdir(), `tts-verify-${process.pid}.wav`)
      let child: ChildProcess
      try {
        child = spawn(pathsService.piperBin(), ['-m', onnx, '-c', json, '-f', wav], {
          stdio: ['pipe', 'ignore', 'ignore']
        })
      } catch {
        resolve(false)
        return
      }
      child.on('error', () => {
        resolve(false)
      })
      child.on('exit', () => {
        resolve(this._wavFileHasAudio({ wavPath: wav }))
      })
      child.stdin?.end('test.\n')
    })
  }

  protected async _downloadFileWithProgress(params: {
    url: string
    dest: string
    onProgress: (p: number) => void
  }): Promise<void> {
    const res = await fetch(params.url)
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${res.status} ${res.statusText}): ${params.url}`)
    }
    const total = Number(res.headers.get('content-length')) || 0
    const reader = res.body.getReader()
    const out = fs.createWriteStream(params.dest)
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      out.write(Buffer.from(value))
      received += value.byteLength
      if (total > 0) {
        params.onProgress(received / total)
      }
    }
    await new Promise<void>((resolve) => {
      out.end(() => {
        resolve()
      })
    })
  }

  protected async _ensurePythonVersionMeetsMinimum(params: {
    onLog: (line: string) => void
  }): Promise<boolean> {
    const exitCode = await this._runCommandStreamingOutput({
      cmd: 'python3',
      args: [
        '-c',
        'import sys; sys.exit(0 if (sys.version_info.major, sys.version_info.minor) >= (3, 9) else 1)'
      ]
    })
    if (exitCode !== 0) {
      params.onLog('error: Python 3.9+ is required to run the Piper engine.')
      return false
    }
    return true
  }

  protected async _createVenvAndInstallPiperIfMissing(params: {
    onLog: (line: string) => void
  }): Promise<boolean> {
    const log = params.onLog
    if (this.isEngineInstalled()) {
      log('piper-tts already installed.')
      return true
    }

    log('Creating virtualenv…')
    const venvExit = await this._runCommandStreamingOutput({
      cmd: 'python3',
      args: ['-m', 'venv', pathsService.venvDir()],
      onLog: log
    })
    if (venvExit !== 0) {
      log('python3 -m venv failed. On Debian/Ubuntu you may need: sudo apt install python3-venv')
      return false
    }

    log('Installing piper-tts (one-time, ~1 min)…')
    await this._runCommandStreamingOutput({
      cmd: this._venvPipBinPath(),
      args: ['install', '-q', '--upgrade', 'pip'],
      onLog: log
    })
    const installExit = await this._runCommandStreamingOutput({
      cmd: this._venvPipBinPath(),
      args: ['install', 'piper-tts'],
      onLog: log
    })
    if (installExit !== 0 || !this.isEngineInstalled()) {
      log('pip install piper-tts failed.')
      if (process.platform === 'darwin') {
        log('On macOS try: brew install espeak-ng   then retry.')
      } else {
        log('On Linux try: sudo apt install espeak-ng-dev   then retry.')
      }
      return false
    }

    log('piper-tts installed.')
    return true
  }

  protected async _downloadEachMissingDefaultVoice(params: {
    onLog: (line: string) => void
  }): Promise<void> {
    const log = params.onLog
    fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
    await constant().piperEngine.defaultInstallVoiceNames.reduce(async (acc, voice) => {
      await acc
      const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
      if (fs.existsSync(onnx)) {
        log(`  present: ${voice}`)
        return
      }
      log(`Downloading ${voice}…`)
      try {
        await this.downloadVoice({ name: voice, onProgress: () => {} })
        log(`  done: ${voice}`)
      } catch (err) {
        log(`  failed: ${voice}: ${String(err)}`)
      }
    }, Promise.resolve())
  }

  protected async _verifySynthesisProducesAudio(params: {
    onLog: (line: string) => void
  }): Promise<void> {
    params.onLog('Verifying synthesis…')
    const verified = await this._verifyVoiceProducesAudio(constant().piperEngine.serbianVoiceName)
    if (verified) {
      params.onLog('  ok')
    } else {
      params.onLog('  verify failed (the engine may still work).')
    }
  }
}

export const piperEngineServiceSingleton = singletonPattern(() => {
  return new PiperEngineService()
})
