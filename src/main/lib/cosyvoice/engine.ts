import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type ChildProcess, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { cosyvoiceSpawnEnv } from '#src/main/lib/cosyvoice/_spawn-env'
import { constant } from '#src/main/util/constants'
import { pathUtil } from '#src/main/util/path-util'
import { type CosyvoiceModelVariant } from '#src/shared/types'

export interface CosyvoiceVoiceMetadata {
  createdAt: number
  lang: string
  name: string
}

interface CosyvoiceModelFile {
  fileName: string
  sizeBytes: number
}

export class CosyvoiceEngine {
  protected _installInFlight: Promise<boolean> | null = null
  protected readonly _downloadsInFlight = new Map<string, Promise<void>>()

  deleteModel(params: { fileName: string }): void {
    const variant = this._variantByFileName({ fileName: params.fileName })
    this._bestEffort(() => {
      fs.rmSync(path.join(pathUtil.cosyvoiceModelDir(), variant.fileName), { force: true })

      return undefined
    })
  }

  deleteVoice(params: { voiceName: string }): void {
    this._bestEffort(() => {
      this._requireSafeVoiceName({ voiceName: params.voiceName })
      fs.rmSync(this._voicePromptPath({ voiceName: params.voiceName }), { force: true })
      fs.rmSync(this._voiceMetadataPath({ voiceName: params.voiceName }), { force: true })

      return undefined
    })
  }

  async downloadFrontend(params: { onProgress: (p: number) => void }): Promise<void> {
    this._requireSupported()
    fs.mkdirSync(pathUtil.cosyvoiceFrontendDir(), { recursive: true })
    const files = constant().cosyvoiceEngine.frontendFiles
    const totalSizeBytes = files.reduce((acc, file) => {
      return acc + file.sizeBytes
    }, 0)
    let base = 0
    await files.reduce(async (acc, file) => {
      await acc
      const weight = file.sizeBytes / totalSizeBytes
      await this._downloadVerifiedWithDedup({
        dest: this._frontendFilePath({ role: file.role }),
        expectedSizeBytes: file.sizeBytes,
        onProgress: (p) => {
          params.onProgress(base + p * weight)
        },
        url: `${constant().cosyvoiceEngine.hfBaseUrl}/${file.path}`,
      })
      base += weight
      params.onProgress(base)
    }, Promise.resolve())
    params.onProgress(1)
  }

  async downloadModel(params: { fileName: string; onProgress: (p: number) => void }): Promise<void> {
    this._requireSupported()
    const variant = this._variantByFileName({ fileName: params.fileName })
    if (this._isModelVariantDownloaded({ variant })) {
      params.onProgress(1)

      return
    }
    fs.mkdirSync(pathUtil.cosyvoiceModelDir(), { recursive: true })
    await this._downloadVerifiedWithDedup({
      dest: path.join(pathUtil.cosyvoiceModelDir(), variant.fileName),
      expectedSizeBytes: variant.sizeBytes,
      onProgress: params.onProgress,
      url: `${constant().cosyvoiceEngine.hfBaseUrl}/${variant.fileName}`,
    })
    params.onProgress(1)
  }

  async installEngine(params: { onLog: (line: string) => void; onProgress: (p: number) => void }): Promise<boolean> {
    const inFlight = this._installInFlight
    if (inFlight) {
      return inFlight
    }
    const promise = this._installEngine(params)
    this._installInFlight = promise
    try {
      const installed = await promise

      return installed
    } finally {
      this._installInFlight = null
    }
  }

  protected async _installEngine(params: {
    onLog: (line: string) => void
    onProgress: (p: number) => void
  }): Promise<boolean> {
    this._requireSupported()
    if (this.isEngineInstalled()) {
      params.onLog('CosyVoice engine already installed.')

      return true
    }
    params.onLog('Downloading cosyvoice.cpp v0.1.2 (macOS arm64, ~15 MB)…')
    fs.mkdirSync(pathUtil.cosyvoiceBinDir(), { recursive: true })
    const archivePath = path.join(pathUtil.cosyvoiceBinDir(), constant().cosyvoiceEngine.archive.fileName)
    await this._downloadVerifiedWithDedup({
      dest: archivePath,
      expectedSizeBytes: constant().cosyvoiceEngine.archive.sizeBytes,
      onProgress: params.onProgress,
      url: constant().cosyvoiceEngine.archive.url,
    })
    params.onLog('Extracting…')
    const exitCode = await this._runCommandStreamingOutput({
      args: ['-xzf', archivePath, '-C', pathUtil.cosyvoiceBinDir()],
      cmd: 'tar',
      onLog: params.onLog,
    })
    this._bestEffort(() => {
      fs.rmSync(archivePath, { force: true })

      return undefined
    })
    if (exitCode !== 0) {
      throw new Error('Extracting the CosyVoice archive failed.')
    }
    this._makeBinariesExecutable()
    params.onLog('CosyVoice engine installed.')

    return this.isEngineInstalled()
  }

  isEngineInstalled(): boolean {
    try {
      return fs.existsSync(pathUtil.cosyvoiceServerBin()) && fs.existsSync(pathUtil.cosyvoiceCliBin())
    } catch {
      return false
    }
  }

  isFrontendInstalled(): boolean {
    return constant().cosyvoiceEngine.frontendFiles.every((file) => {
      return this._fileMatchesSize({
        file: this._frontendFilePath({ role: file.role }),
        sizeBytes: file.sizeBytes,
      })
    })
  }

  isSupported(): boolean {
    return process.platform === 'darwin' && process.arch === 'arm64'
  }

  installedModelFileName(): string | null {
    const variant = constant().cosyvoiceEngine.modelVariants.find((candidate) => {
      return this._isModelVariantDownloaded({ variant: candidate })
    })

    return variant?.fileName ?? null
  }

  installedVoiceNames(): string[] {
    const suffix = constant().cosyvoiceEngine.voicePromptSuffix
    try {
      return fs
        .readdirSync(pathUtil.cosyvoiceVoicesDir())
        .filter((entry) => {
          return entry.endsWith(suffix)
        })
        .map((entry) => {
          return entry.slice(0, -suffix.length)
        })
        .sort()
    } catch {
      return []
    }
  }

  modelVariants(): CosyvoiceModelVariant[] {
    return constant().cosyvoiceEngine.modelVariants.map((variant) => {
      return {
        fileName: variant.fileName,
        isDownloaded: this._isModelVariantDownloaded({ variant }),
        sizeBytes: variant.sizeBytes,
      }
    })
  }

  readVoiceMetadata(params: { voiceName: string }): CosyvoiceVoiceMetadata | null {
    try {
      this._requireSafeVoiceName({ voiceName: params.voiceName })
      const raw = fs.readFileSync(this._voiceMetadataPath({ voiceName: params.voiceName }), 'utf8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (typeof parsed.name !== 'string' || typeof parsed.lang !== 'string' || typeof parsed.createdAt !== 'number') {
        return null
      }

      return { createdAt: parsed.createdAt, lang: parsed.lang, name: parsed.name }
    } catch {
      return null
    }
  }

  uninstallEngine(): void {
    this._bestEffort(() => {
      fs.rmSync(pathUtil.cosyvoiceBinDir(), { force: true, recursive: true })

      return undefined
    })
  }

  async createVoice(params: {
    displayName: string
    lang: string
    onLog: (line: string) => void
    promptAudioPath: string
    promptText: string
  }): Promise<string> {
    this._requireSupported()
    if (!this.isEngineInstalled()) {
      throw new Error('CosyVoice engine is not installed. Open Settings → Models.')
    }
    if (!this.isFrontendInstalled()) {
      throw new Error('CosyVoice frontend models are not downloaded. Download them before creating a voice.')
    }
    const voiceName = this._uniqueVoiceFileName({
      attempt: 0,
      fileName: this._sanitizeVoiceFileName({ displayName: params.displayName }),
    })
    const promptSpeechOutput = this._voicePromptPath({ voiceName })
    fs.mkdirSync(pathUtil.cosyvoiceVoicesDir(), { recursive: true })
    params.onLog(`Creating voice "${params.displayName}"…`)
    const exitCode = await this._runCommandStreamingOutput({
      args: [
        '--campplus',
        this._frontendFilePath({ role: 'campplus' }),
        '--frontend-only',
        '--prompt-audio',
        params.promptAudioPath,
        '--prompt-speech-output',
        promptSpeechOutput,
        '--prompt-text',
        params.promptText,
        '--speech-tokenizer',
        this._frontendFilePath({ role: 'speechTokenizer' }),
      ],
      cmd: pathUtil.cosyvoiceCliBin(),
      env: cosyvoiceSpawnEnv.build(),
      onLog: params.onLog,
    })
    if (exitCode !== 0 || !fs.existsSync(promptSpeechOutput)) {
      this._bestEffort(() => {
        fs.rmSync(promptSpeechOutput, { force: true })

        return undefined
      })
      throw new Error(`Voice creation failed (exit code ${String(exitCode)}). Check the log for details.`)
    }
    this._writeVoiceMetadata({ lang: params.lang, name: params.displayName, voiceName })
    params.onLog(`Voice "${voiceName}" created.`)

    return voiceName
  }

  hasVoicePrompt(params: { voiceName: string }): boolean {
    try {
      this._requireSafeVoiceName({ voiceName: params.voiceName })

      return fs.existsSync(this._voicePromptPath({ voiceName: params.voiceName }))
    } catch {
      return false
    }
  }

  protected async _downloadVerifiedWithDedup(params: {
    dest: string
    expectedSizeBytes: number
    onProgress: (p: number) => void
    url: string
  }): Promise<void> {
    const inFlight = this._downloadsInFlight.get(params.dest)
    if (inFlight) {
      await inFlight

      return
    }
    const promise = this._downloadFileWithProgress(params)
    this._downloadsInFlight.set(params.dest, promise)
    try {
      await promise
    } finally {
      this._downloadsInFlight.delete(params.dest)
    }
  }

  protected async _downloadFileWithProgress(params: {
    dest: string
    expectedSizeBytes: number
    onProgress: (p: number) => void
    url: string
  }): Promise<void> {
    const res = await fetch(params.url, {
      signal: AbortSignal.timeout(constant().cosyvoiceEngine.downloadTimeoutMs),
    })
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${String(res.status)} ${res.statusText}): ${params.url}`)
    }
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
      await this._pumpDownloadChunks({
        expectedSizeBytes: params.expectedSizeBytes,
        onProgress: params.onProgress,
        out,
        reader,
      })
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
    const sizeBytes = this._fileSizeBytes({ file: params.dest })
    if (sizeBytes !== params.expectedSizeBytes) {
      this._bestEffort(() => {
        fs.rmSync(params.dest, { force: true })

        return undefined
      })
      throw new Error(
        `Downloaded file has unexpected size (expected ${String(params.expectedSizeBytes)}, got ${String(sizeBytes)}): ${params.url}`,
      )
    }
  }

  protected async _pumpDownloadChunks(params: {
    expectedSizeBytes: number
    onProgress: (progress: number) => void
    out: fs.WriteStream
    reader: ReadableStreamDefaultReader<Uint8Array>
  }): Promise<void> {
    const { done, value } = await params.reader.read()
    if (done) {
      return Promise.resolve()
    }
    params.out.write(Buffer.from(value))
    params.onProgress(params.out.bytesWritten / params.expectedSizeBytes)

    return this._pumpDownloadChunks(params)
  }

  protected _runCommandStreamingOutput(params: {
    args: string[]
    cmd: string
    env?: NodeJS.ProcessEnv
    onLog?: (line: string) => void
  }): Promise<number> {
    return new Promise((resolve) => {
      const child: ChildProcess = spawn(params.cmd, params.args, { env: params.env })
      const onOutput = (d: Buffer): void => {
        this._forwardOutputLineByLine({ onLog: params.onLog, output: d })
      }
      child.stdout?.on('data', onOutput)
      child.stderr?.on('data', onOutput)
      child.on('exit', (code) => {
        resolve(code ?? -1)
      })
      child.on('error', (err) => {
        params.onLog?.(String(err))
        resolve(-1)
      })
    })
  }

  protected _forwardOutputLineByLine(params: { onLog?: (line: string) => void; output: Buffer }): void {
    params.output
      .toString()
      .split('\n')
      .forEach((line) => {
        if (line.trim()) {
          params.onLog?.(line)
        }
      })
  }

  protected _makeBinariesExecutable(): void {
    ;['cosyvoice-server', 'cosyvoice-cli', 'quantize'].forEach((name) => {
      this._bestEffort(() => {
        fs.chmodSync(path.join(pathUtil.cosyvoiceBinDir(), name), 0o755)

        return undefined
      })
    })
  }

  protected _sanitizeVoiceFileName(params: { displayName: string }): string {
    const sanitized = params.displayName
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (sanitized.length > 0) {
      return sanitized
    }

    return `voice-${String(Date.now())}`
  }

  protected _voiceFileNameCandidate(params: { attempt: number; fileName: string }): string {
    if (params.attempt === 0) {
      return params.fileName
    }

    return `${params.fileName}-${String(params.attempt + 1)}`
  }

  protected _uniqueVoiceFileName(params: { attempt: number; fileName: string }): string {
    if (params.attempt > 100) {
      throw new Error('Could not find a free name for the new voice.')
    }
    const candidate = this._voiceFileNameCandidate({ attempt: params.attempt, fileName: params.fileName })
    const promptExists = fs.existsSync(this._voicePromptPath({ voiceName: candidate }))
    const metadataExists = fs.existsSync(this._voiceMetadataPath({ voiceName: candidate }))
    if (!promptExists && !metadataExists) {
      return candidate
    }

    return this._uniqueVoiceFileName({ attempt: params.attempt + 1, fileName: params.fileName })
  }

  protected _writeVoiceMetadata(params: { lang: string; name: string; voiceName: string }): void {
    this._requireSafeVoiceName({ voiceName: params.voiceName })
    const metadata: CosyvoiceVoiceMetadata = {
      createdAt: Date.now(),
      lang: params.lang,
      name: params.name,
    }
    fs.writeFileSync(this._voiceMetadataPath({ voiceName: params.voiceName }), JSON.stringify(metadata), 'utf8')
  }

  protected _frontendFilePath(params: { role: string }): string {
    const file = constant().cosyvoiceEngine.frontendFiles.find((candidate) => {
      return candidate.role === params.role
    })
    if (file === undefined) {
      throw new Error(`CosyVoice frontend file for "${params.role}" is not configured.`)
    }

    return path.join(pathUtil.cosyvoiceFrontendDir(), path.basename(file.path))
  }

  protected _isModelVariantDownloaded(params: { variant: CosyvoiceModelFile }): boolean {
    return this._fileMatchesSize({
      file: path.join(pathUtil.cosyvoiceModelDir(), params.variant.fileName),
      sizeBytes: params.variant.sizeBytes,
    })
  }

  protected _variantByFileName(params: { fileName: string }): CosyvoiceModelFile {
    const variant = constant().cosyvoiceEngine.modelVariants.find((candidate) => {
      return candidate.fileName === params.fileName
    })
    if (variant === undefined) {
      throw new Error(`Unknown CosyVoice model variant: ${params.fileName}`)
    }

    return variant
  }

  protected _voicePromptPath(params: { voiceName: string }): string {
    return path.join(
      pathUtil.cosyvoiceVoicesDir(),
      `${params.voiceName}${constant().cosyvoiceEngine.voicePromptSuffix}`,
    )
  }

  protected _voiceMetadataPath(params: { voiceName: string }): string {
    return path.join(
      pathUtil.cosyvoiceVoicesDir(),
      `${params.voiceName}${constant().cosyvoiceEngine.voiceMetadataSuffix}`,
    )
  }

  protected _requireSafeVoiceName(params: { voiceName: string }): void {
    if (!/^[A-Za-z0-9_-]+$/.test(params.voiceName)) {
      throw new Error(`Invalid CosyVoice voice name: ${params.voiceName}`)
    }
  }

  protected _requireSupported(): void {
    if (!this.isSupported()) {
      throw new Error('CosyVoice is only supported on Apple Silicon Macs (macOS arm64).')
    }
  }

  protected _fileMatchesSize(params: { file: string; sizeBytes: number }): boolean {
    try {
      return fs.statSync(params.file).size === params.sizeBytes
    } catch {
      return false
    }
  }

  protected _fileSizeBytes(params: { file: string }): number {
    try {
      return fs.statSync(params.file).size
    } catch {
      return 0
    }
  }

  protected _bestEffort(action: () => unknown): void {
    try {
      action()
    } catch {
      return undefined
    }
  }
}

export const cosyvoiceEngineSingleton = singletonPattern(() => {
  return new CosyvoiceEngine()
})
