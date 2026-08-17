import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { constant } from '@src/main/util/constants'
import { pathUtil } from '@src/main/util/path-util'
import { languageCatalogSingleton } from '@src/shared/language/language-catalog'
import type { RemoteVoice } from '@src/shared/types'

interface HfTreeEntry {
  type: 'file' | 'directory'
  path: string
  size: number
  lfs?: { size: number }
}

export class PiperEngine {
  public isEngineInstalled(): boolean {
    try {
      return fs.existsSync(pathUtil.piperBin())
    } catch {
      return false
    }
  }

  public async installEngine(params: {
    voiceNames: string[]
    onLog: (line: string) => void
  }): Promise<boolean> {
    const log = params.onLog

    const pythonOk = await this._ensurePythonVersionMeetsMinimum({ onLog: log })
    if (!pythonOk) {
      return false
    }

    const installed = await this._createVenvAndInstallPiperIfMissing({ onLog: log })
    if (!installed) {
      return false
    }

    await this._downloadEachMissingVoice({ voiceNames: params.voiceNames, onLog: log })

    await this._verifySynthesisProducesAudio({ voiceNames: params.voiceNames, onLog: log })
    log('[done]')
    return this.isEngineInstalled()
  }

  public async downloadVoice(params: {
    name: string
    onProgress: (p: number) => void
  }): Promise<void> {
    fs.mkdirSync(pathUtil.modelsDir(), { recursive: true })
    const prefix = this._resolveVoiceDownloadUrlPrefix({ name: params.name })
    const files = [
      { ext: 'onnx', weight: 0.97 },
      { ext: 'onnx.json', weight: 0.03 }
    ]
    let base = 0
    await files.reduce(async (acc, f) => {
      await acc
      const dest = path.join(pathUtil.modelsDir(), `${params.name}.${f.ext}`)
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
    const byCode = languageCatalogSingleton().list().find((language) => {
      return language.code === q
    })
    if (byCode) {
      return byCode.code
    }
    const byName = languageCatalogSingleton().list().find((language) => {
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
    return path.join(pathUtil.venvDir(), 'bin', 'pip')
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
        cwd: pathUtil.projectRoot(),
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

  protected _voiceModelFilePaths(params: { name: string }): { onnx: string; json: string } {
    return {
      onnx: path.join(pathUtil.modelsDir(), `${params.name}.onnx`),
      json: path.join(pathUtil.modelsDir(), `${params.name}.onnx.json`)
    }
  }

  protected _voiceModelFilesExist(params: { name: string }): boolean {
    const paths = this._voiceModelFilePaths({ name: params.name })
    return fs.existsSync(paths.onnx) && fs.existsSync(paths.json)
  }

  protected _verifyVoiceProducesAudio(voice: string): Promise<boolean> {
    return new Promise((resolve) => {
      const paths = this._voiceModelFilePaths({ name: voice })
      if (!fs.existsSync(paths.onnx) || !fs.existsSync(paths.json)) {
        resolve(false)
        return
      }
      const wav = path.join(os.tmpdir(), `tts-verify-${process.pid}.wav`)
      let child: ChildProcess
      try {
        child = spawn(pathUtil.piperBin(), ['-m', paths.onnx, '-c', paths.json, '-f', wav], {
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
    const res = await fetch(params.url, {
      signal: AbortSignal.timeout(constant().piperEngine.downloadTimeoutMs)
    })
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${res.status} ${res.statusText}): ${params.url}`)
    }
    const total = Number(res.headers.get('content-length')) || 0
    const reader = res.body.getReader()
    const out = fs.createWriteStream(params.dest)
    const streamSettled = new Promise<void>((resolve, reject) => {
      out.on('error', (err) => {
        reject(err)
      })
      out.on('finish', () => {
        resolve()
      })
    })
    streamSettled.catch(() => {})
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        out.write(Buffer.from(value))
        if (total > 0) {
          params.onProgress(out.bytesWritten / total)
        }
      }
      out.end()
      await streamSettled
    } catch (err) {
      try {
        await reader.cancel()
      } catch {}
      out.destroy()
      try {
        fs.rmSync(params.dest, { force: true })
      } catch {}
      throw err
    }
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
      args: ['-m', 'venv', pathUtil.venvDir()],
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

  protected async _downloadEachMissingVoice(params: {
    voiceNames: string[]
    onLog: (line: string) => void
  }): Promise<void> {
    const log = params.onLog
    fs.mkdirSync(pathUtil.modelsDir(), { recursive: true })
    if (params.voiceNames.length === 0) {
      log('No voices selected — installing engine only.')
      return
    }
    await params.voiceNames.reduce(async (acc, voice) => {
      await acc
      if (this._voiceModelFilesExist({ name: voice })) {
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
    voiceNames: string[]
    onLog: (line: string) => void
  }): Promise<void> {
    const voice = params.voiceNames.find((name) => {
      return this._voiceModelFilesExist({ name })
    })
    if (voice === undefined) {
      params.onLog('Skipping synthesis verification (no selected voice on disk).')
      return
    }
    params.onLog(`Verifying synthesis with ${voice}…`)
    const verified = await this._verifyVoiceProducesAudio(voice)
    if (verified) {
      params.onLog('  ok')
    } else {
      params.onLog('  verify failed (the engine may still work).')
    }
  }
}

export const piperEngineSingleton = singletonPattern(() => {
  return new PiperEngine()
})
