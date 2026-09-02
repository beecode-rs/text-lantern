import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { constant } from '#src/main/util/constants'
import { pathUtil } from '#src/main/util/path-util'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import { type RemoteVoice, TtsProvider } from '#src/shared/types'
import { voiceUrlParser } from '#src/shared/voice/voice-url'

interface HfTreeEntry {
  type: 'file' | 'directory'
  path: string
  size: number
  lfs?: { size: number }
}

export class PiperEngine {
  isEngineInstalled(): boolean {
    try {
      return fs.existsSync(pathUtil.piperBin())
    } catch {
      return false
    }
  }

  async installEngine(params: { voiceNames: string[]; onLog: (line: string) => void }): Promise<boolean> {
    const log = params.onLog

    const pythonOk = await this._ensurePythonVersionMeetsMinimum({ onLog: log })
    if (!pythonOk) {
      return false
    }

    const installed = await this._createVenvAndInstallPiperIfMissing({ onLog: log })
    if (!installed) {
      return false
    }

    await this._downloadEachMissingVoice({ onLog: log, voiceNames: params.voiceNames })

    await this._verifySynthesisProducesAudio({ onLog: log, voiceNames: params.voiceNames })
    log('[done]')

    return this.isEngineInstalled()
  }

  async downloadVoice(params: { name: string; onProgress: (p: number) => void }): Promise<void> {
    const prefix = this._resolveVoiceDownloadUrlPrefix({ name: params.name })
    await this._downloadVoiceFilePair({
      jsonUrl: `${prefix}/${params.name}.onnx.json`,
      name: params.name,
      onnxUrl: `${prefix}/${params.name}.onnx`,
      onProgress: params.onProgress,
    })
  }

  async downloadVoiceFromUrl(params: { onProgress: (p: number) => void; url: string }): Promise<string> {
    const parsed = voiceUrlParser.parse({ url: params.url })
    if (!parsed) {
      throw new Error('Not a voice file link — it must point to a .onnx or .onnx.json file.')
    }
    await this._downloadVoiceFilePair({
      jsonUrl: parsed.jsonUrl,
      name: parsed.name,
      onnxUrl: parsed.onnxUrl,
      onProgress: params.onProgress,
    })

    return parsed.name
  }

  async searchVoices(params: { query: string }): Promise<RemoteVoice[]> {
    const codes = this._resolveLangCodes({ query: params.query })
    if (codes.length === 0) {
      return []
    }
    const voicesPerLang = await Promise.all(
      codes.map((code) => {
        return this._fetchRemoteVoicesForLang({ code })
      }),
    )

    return voicesPerLang.flat().sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  }

  protected async _downloadVoiceFilePair(params: {
    jsonUrl: string
    name: string
    onnxUrl: string
    onProgress: (p: number) => void
  }): Promise<void> {
    fs.mkdirSync(pathUtil.modelsDir(), { recursive: true })
    const files = [
      { ext: 'onnx', url: params.onnxUrl, weight: 0.97 },
      { ext: 'onnx.json', url: params.jsonUrl, weight: 0.03 },
    ]
    let base = 0
    await files.reduce(async (acc, f) => {
      await acc
      const dest = path.join(pathUtil.modelsDir(), `${params.name}.${f.ext}`)
      await this._downloadFileWithProgress({
        dest,
        onProgress: (p) => {
          params.onProgress(base + p * f.weight)
        },
        url: f.url,
      })
      base += f.weight
      params.onProgress(base)
    }, Promise.resolve())
    params.onProgress(1)
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

    return { lang, langRegion, quality, voice }
  }

  protected _resolveVoiceDownloadUrlPrefix(params: { name: string }): string {
    if (params.name === constant().piperEngine.serbianVoiceName) {
      return constant().piperEngine.serbianVoicesRepoUrl
    }
    const { lang, langRegion, voice, quality } = this._splitVoiceNameIntoParts(params.name)

    return `${constant().piperEngine.piperVoicesBaseUrl}/${lang}/${langRegion}/${voice}/${quality}`
  }

  protected _resolveLangCodes(params: { query: string }): string[] {
    const matched = languageCatalogSingleton()
      .match({ limit: constant().piperEngine.searchMaxLanguageCount, query: params.query })
      .map((language) => {
        return language.code
      })
    if (matched.length > 0) {
      return matched
    }
    const rawCode = params.query.trim().toLowerCase()
    if (/^[a-z]{1,3}$/.test(rawCode)) {
      return [rawCode]
    }

    return []
  }

  protected async _fetchRemoteVoicesForLang(params: { code: string }): Promise<RemoteVoice[]> {
    const url = `${constant().piperEngine.piperVoicesTreeApiUrl}/${encodeURIComponent(params.code)}?recursive=true`
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
        return entry.path.startsWith(`${params.code}/`)
      })
      .map((entry) => {
        return this._entryToRemoteVoice({ entry })
      })
      .filter((voice): voice is RemoteVoice => {
        return voice !== null
      })
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
      lang,
      name,
      provider: TtsProvider.PIPER,
      quality,
      sizeBytes: entry.lfs?.size ?? entry.size,
    }
  }

  protected _venvPipBinPath(): string {
    return pathUtil.venvPip()
  }

  protected _forwardCommandOutputLineByLine(params: { output: Buffer; onLog?: (line: string) => void }): void {
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
        env: { ...process.env, ...(params.env ?? {}) },
      })
      const onStdout = (d: Buffer): void => {
        this._forwardCommandOutputLineByLine({ onLog: params.onLog, output: d })
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

  protected _bestEffort(action: () => unknown): void {
    try {
      action()
    } catch {
      return undefined
    }
  }

  protected _wavFileHasAudio(params: { wavPath: string }): boolean {
    try {
      return fs.existsSync(params.wavPath) && fs.statSync(params.wavPath).size > 0
    } catch {
      return false
    } finally {
      this._bestEffort(() => {
        fs.rmSync(params.wavPath, { force: true })

        return undefined
      })
    }
  }

  protected _voiceModelFilePaths(params: { name: string }): { onnx: string; json: string } {
    return {
      json: path.join(pathUtil.modelsDir(), `${params.name}.onnx.json`),
      onnx: path.join(pathUtil.modelsDir(), `${params.name}.onnx`),
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
      const wav = path.join(os.tmpdir(), `tts-verify-${String(process.pid)}.wav`)
      let child: ChildProcess
      try {
        child = spawn(pathUtil.piperBin(), ['-m', paths.onnx, '-c', paths.json, '-f', wav], {
          stdio: ['pipe', 'ignore', 'ignore'],
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
      signal: AbortSignal.timeout(constant().piperEngine.downloadTimeoutMs),
    })
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${String(res.status)} ${res.statusText}): ${params.url}`)
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
    streamSettled.catch(() => {
      return undefined
    })
    try {
      await this._pumpDownloadChunks({ onProgress: params.onProgress, out, reader, total })
      out.end()
      await streamSettled
    } catch (err) {
      this._bestEffort(() => {
        void reader.cancel()

        return undefined
      })
      out.destroy()
      this._bestEffort(() => {
        fs.rmSync(params.dest, { force: true })

        return undefined
      })
      throw err
    }
  }

  protected async _pumpDownloadChunks(params: {
    onProgress: (progress: number) => void
    out: fs.WriteStream
    reader: ReadableStreamDefaultReader<Uint8Array>
    total: number
  }): Promise<void> {
    const { done, value } = await params.reader.read()
    if (done) {
      return Promise.resolve()
    }
    params.out.write(Buffer.from(value))
    if (params.total > 0) {
      params.onProgress(params.out.bytesWritten / params.total)
    }

    return this._pumpDownloadChunks(params)
  }

  protected async _ensurePythonVersionMeetsMinimum(params: { onLog: (line: string) => void }): Promise<boolean> {
    const exitCode = await this._runCommandStreamingOutput({
      args: ['-c', 'import sys; sys.exit(0 if (sys.version_info.major, sys.version_info.minor) >= (3, 9) else 1)'],
      cmd: pathUtil.pythonCommand(),
    })
    if (exitCode !== 0) {
      params.onLog('error: Python 3.9+ is required to run the Piper engine.')

      return false
    }

    return true
  }

  protected async _createVenvAndInstallPiperIfMissing(params: { onLog: (line: string) => void }): Promise<boolean> {
    const log = params.onLog
    if (this.isEngineInstalled()) {
      log('piper-tts already installed.')

      return true
    }

    log('Creating virtualenv…')
    const venvExit = await this._runCommandStreamingOutput({
      args: ['-m', 'venv', pathUtil.venvDir()],
      cmd: pathUtil.pythonCommand(),
      onLog: log,
    })
    if (venvExit !== 0) {
      log('python -m venv failed. On Debian/Ubuntu you may need: sudo apt install python3-venv')

      return false
    }

    log('Installing piper-tts (one-time, ~1 min)…')
    await this._runCommandStreamingOutput({
      args: ['install', '-q', '--upgrade', 'pip'],
      cmd: this._venvPipBinPath(),
      onLog: log,
    })
    const installExit = await this._runCommandStreamingOutput({
      args: ['install', 'piper-tts'],
      cmd: this._venvPipBinPath(),
      onLog: log,
    })
    if (installExit !== 0 || !this.isEngineInstalled()) {
      log('pip install piper-tts failed.')
      if (process.platform === 'darwin') {
        log('On macOS try: brew install espeak-ng   then retry.')
      } else if (process.platform === 'win32') {
        log('On Windows try: reinstall Python with "Add python.exe to PATH" checked, then retry.')
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
        await this.downloadVoice({
          name: voice,
          onProgress: () => {
            return undefined
          },
        })
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
