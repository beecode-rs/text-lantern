import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type ChildProcess, spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

import { cosyvoiceSpawnEnv } from '#src/main/lib/cosyvoice/_spawn-env'
import { constant } from '#src/main/util/constants'
import { pathUtil } from '#src/main/util/path-util'

export class CosyvoiceServer {
  protected _activeAbort: AbortController | null = null
  protected _child: ChildProcess | null = null
  protected _childSignature: string | null = null
  protected _disposed = false
  protected _ensureChain: Promise<unknown> = Promise.resolve()
  protected _port: number | null = null
  protected _readyPromise: Promise<void> | null = null
  protected _readyReject: ((error: Error) => void) | null = null
  protected _stderrTail = ''

  ensureReady(params: { modelFileName: string; voiceNames: string[] }): Promise<void> {
    this._disposed = false
    const result = this._ensureChain.then(() => {
      return this._ensureReadySerialized(params)
    })
    this._ensureChain = result.then(
      () => {
        return undefined
      },
      () => {
        return undefined
      },
    )

    return result
  }

  async synthesize(params: {
    onChunk: (chunk: Buffer) => void
    speed: number
    text: string
    voiceName: string
  }): Promise<void> {
    const port = this._port
    if (port === null || this._child === null) {
      throw new Error('CosyVoice server is not running')
    }
    const abort = new AbortController()
    this._activeAbort = abort
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    try {
      const res = await fetch(this._speechUrl({ port }), {
        body: this._speechRequestBody({ speed: params.speed, text: params.text, voiceName: params.voiceName }),
        headers,
        method: 'POST',
        signal: abort.signal,
      })
      if (!res.ok || !res.body) {
        throw new Error(`CosyVoice synthesis failed (${String(res.status)} ${res.statusText})`)
      }
      await this._pumpSpeechStream({
        onChunk: params.onChunk,
        reader: res.body.getReader(),
        streamState: { hasStrippedHeader: false, pending: Buffer.alloc(0) },
      })
    } finally {
      if (this._activeAbort === abort) {
        this._activeAbort = null
      }
    }
  }

  async cancelActive(): Promise<void> {
    this._abortActive()

    return Promise.resolve()
  }

  dispose(): void {
    this._disposed = true
    this._killChild()
  }

  protected async _ensureReadySerialized(params: { modelFileName: string; voiceNames: string[] }): Promise<void> {
    return this._spawnUntilReady({
      attemptLeft: constant().cosyvoiceServer.startupMaxAttempts,
      modelFileName: params.modelFileName,
      previousError: null,
      voiceNames: params.voiceNames,
    })
  }

  protected async _spawnUntilReady(params: {
    attemptLeft: number
    modelFileName: string
    previousError: unknown
    voiceNames: string[]
  }): Promise<void> {
    if (this._disposed) {
      if (params.previousError instanceof Error) {
        throw params.previousError
      }
      throw new Error('CosyVoice server was stopped')
    }
    if (params.attemptLeft <= 0) {
      if (params.previousError instanceof Error) {
        throw params.previousError
      }
      throw new Error('CosyVoice server failed to start')
    }
    const signature = this._signature({ modelFileName: params.modelFileName, voiceNames: params.voiceNames })
    if (this._child && this._childSignature === signature && this._readyPromise) {
      return this._readyPromise
    }
    if (this._child) {
      this._killChild()
    }
    try {
      await this._spawn({ modelFileName: params.modelFileName, voiceNames: params.voiceNames })

      return
    } catch (error) {
      return this._spawnUntilReady({
        attemptLeft: params.attemptLeft - 1,
        modelFileName: params.modelFileName,
        previousError: error,
        voiceNames: params.voiceNames,
      })
    }
  }

  protected async _spawn(params: { modelFileName: string; voiceNames: string[] }): Promise<void> {
    if (params.voiceNames.length === 0) {
      throw new Error('No CosyVoice voices are installed.')
    }
    const port = await this._findFreePort()
    this._stderrTail = ''
    const voicePromptArgs = params.voiceNames.flatMap((voiceName) => {
      return [
        '--voice-prompt',
        `${voiceName}=${path.join(
          pathUtil.cosyvoiceVoicesDir(),
          `${voiceName}${constant().cosyvoiceEngine.voicePromptSuffix}`,
        )}`,
      ]
    })
    const proc = spawn(
      pathUtil.cosyvoiceServerBin(),
      [
        '--api',
        '--host',
        constant().cosyvoiceServer.host,
        '--model',
        path.join(pathUtil.cosyvoiceModelDir(), params.modelFileName),
        '--served-model-name',
        constant().cosyvoiceServer.servedModelName,
        '--port',
        String(port),
        ...voicePromptArgs,
      ],
      { env: cosyvoiceSpawnEnv.build(), stdio: ['ignore', 'ignore', 'pipe'] },
    )
    this._child = proc
    this._port = port
    this._childSignature = this._signature({ modelFileName: params.modelFileName, voiceNames: params.voiceNames })
    proc.stderr.on('data', (chunk: Buffer) => {
      if (proc !== this._child) {
        return
      }
      this._stderrTail = (this._stderrTail + chunk.toString()).slice(-constant().cosyvoiceServer.stderrTailChars)
    })
    proc.on('error', (err) => {
      if (proc !== this._child) {
        return
      }
      this._clearChildState()
      if (err instanceof Error) {
        this._rejectReady(err)
      } else {
        this._rejectReady(new Error(String(err)))
      }
    })
    proc.on('exit', () => {
      if (proc !== this._child) {
        return
      }
      this._clearChildState()
      this._rejectReady(new Error(this._formatExitError()))
      this._abortActive()
    })
    const exited = new Promise<never>((_resolve, reject) => {
      this._readyReject = reject
    })
    void exited.catch(() => {
      return undefined
    })
    const deadlineMs = Date.now() + constant().cosyvoiceServer.readinessTimeoutMs
    this._readyPromise = Promise.race([this._waitForHealthz({ deadlineMs, port }), exited])

    return this._readyPromise
  }

  protected async _waitForHealthz(params: { deadlineMs: number; port: number }): Promise<void> {
    if (Date.now() > params.deadlineMs) {
      throw new Error('CosyVoice server startup timed out')
    }
    const isReady = await this._healthzResponds({ port: params.port })
    if (isReady) {
      return Promise.resolve()
    }
    await this._sleepMs({ ms: constant().cosyvoiceServer.readinessIntervalMs })

    return this._waitForHealthz({ deadlineMs: params.deadlineMs, port: params.port })
  }

  protected async _healthzResponds(params: { port: number }): Promise<boolean> {
    try {
      const res = await fetch(this._healthzUrl({ port: params.port }), {
        signal: AbortSignal.timeout(constant().cosyvoiceServer.readinessIntervalMs * 4),
      })

      return res.ok
    } catch {
      return false
    }
  }

  protected _sleepMs(params: { ms: number }): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, params.ms)
    })
  }

  protected _findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.unref()
      server.on('error', (err) => {
        reject(err)
      })
      server.listen(0, constant().cosyvoiceServer.host, () => {
        const port = this._portFromAddress({ address: server.address() })
        server.close(() => {
          resolve(port)
        })
      })
    })
  }

  protected _portFromAddress(params: { address: string | net.AddressInfo | null }): number {
    if (typeof params.address === 'object' && params.address !== null) {
      return params.address.port
    }

    return 0
  }

  protected _speechRequestBody(params: { speed: number; text: string; voiceName: string }): string {
    const payload: Record<string, unknown> = {
      input: params.text,
      model: constant().cosyvoiceServer.servedModelName,
      speed: params.speed,
      stream: true,
      voice: params.voiceName,
    }
    payload['response_format'] = constant().cosyvoiceServer.responseFormat

    return JSON.stringify(payload)
  }

  protected async _pumpSpeechStream(params: {
    onChunk: (chunk: Buffer) => void
    reader: ReadableStreamDefaultReader<Uint8Array>
    streamState: { hasStrippedHeader: boolean; pending: Buffer }
  }): Promise<void> {
    const { done, value } = await params.reader.read()
    if (done) {
      this._flushPending({ onChunk: params.onChunk, streamState: params.streamState })

      return Promise.resolve()
    }
    const chunk = Buffer.concat([params.streamState.pending, Buffer.from(value)])
    params.streamState.pending = Buffer.alloc(0)
    if (!params.streamState.hasStrippedHeader) {
      if (chunk.length < constant().cosyvoiceServer.minWavHeaderBytes) {
        params.streamState.pending = chunk

        return this._pumpSpeechStream(params)
      }
      const headerBytes = this._wavHeaderByteLength({ buffer: chunk })
      if (headerBytes < 0) {
        if (chunk.length >= constant().cosyvoiceServer.wavHeaderScanMaxBytes) {
          throw new Error('CosyVoice audio stream had an invalid WAV header.')
        }
        params.streamState.pending = chunk

        return this._pumpSpeechStream(params)
      }
      params.streamState.hasStrippedHeader = true
      const pcm = chunk.subarray(headerBytes)
      if (pcm.length > 0) {
        params.onChunk(pcm)
      }

      return this._pumpSpeechStream(params)
    }
    params.onChunk(chunk)

    return this._pumpSpeechStream(params)
  }

  protected _flushPending(params: {
    onChunk: (chunk: Buffer) => void
    streamState: { hasStrippedHeader: boolean; pending: Buffer }
  }): void {
    if (params.streamState.pending.length === 0) {
      return undefined
    }
    const headerBytes = this._pendingHeaderBytes({ streamState: params.streamState })
    const pcm = params.streamState.pending.subarray(headerBytes)
    if (pcm.length > 0) {
      params.onChunk(pcm)
    }

    return undefined
  }

  protected _pendingHeaderBytes(params: { streamState: { hasStrippedHeader: boolean; pending: Buffer } }): number {
    if (params.streamState.hasStrippedHeader) {
      return 0
    }
    const headerBytes = this._wavHeaderByteLength({ buffer: params.streamState.pending })
    if (headerBytes < 0) {
      return params.streamState.pending.length
    }

    return headerBytes
  }

  protected _wavHeaderByteLength(params: { buffer: Buffer }): number {
    const { buffer } = params
    const hasRiffHeader =
      buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE'
    if (!hasRiffHeader) {
      return 0
    }

    return this._dataChunkOffset({ buffer, offset: 12 })
  }

  protected _dataChunkOffset(params: { buffer: Buffer; offset: number }): number {
    if (params.offset + 8 > params.buffer.length) {
      return -1
    }
    const chunkId = params.buffer.toString('ascii', params.offset, params.offset + 4)
    const chunkSize = params.buffer.readUInt32LE(params.offset + 4)
    if (chunkId === 'data') {
      return params.offset + 8
    }
    const paddedSize = chunkSize + (chunkSize % 2)

    return this._dataChunkOffset({ buffer: params.buffer, offset: params.offset + 8 + paddedSize })
  }

  protected _killChild(): void {
    const child = this._child
    this._clearChildState()
    if (child) {
      try {
        child.kill('SIGTERM')
      } catch {
        return undefined
      }
    }
    this._rejectReady(new Error('CosyVoice server stopped'))
    this._abortActive()
  }

  protected _clearChildState(): void {
    this._child = null
    this._port = null
    this._childSignature = null
    this._readyPromise = null
  }

  protected _rejectReady(error: Error): void {
    if (this._readyReject) {
      const reject = this._readyReject
      this._readyReject = null
      reject(error)
    }
  }

  protected _abortActive(): void {
    const abort = this._activeAbort
    this._activeAbort = null
    abort?.abort()
  }

  protected _formatExitError(): string {
    const detail = this._stderrTail.trim()
    if (detail) {
      return `CosyVoice server exited during startup. ${detail}`
    }

    return 'CosyVoice server exited during startup.'
  }

  protected _signature(params: { modelFileName: string; voiceNames: string[] }): string {
    return `${params.modelFileName}|${[...params.voiceNames].sort().join(',')}`
  }

  protected _healthzUrl(params: { port: number }): string {
    return `http://${constant().cosyvoiceServer.host}:${String(params.port)}/healthz`
  }

  protected _speechUrl(params: { port: number }): string {
    return `http://${constant().cosyvoiceServer.host}:${String(params.port)}/v1/audio/speech`
  }
}

export const cosyvoiceServerSingleton = singletonPattern(() => {
  return new CosyvoiceServer()
})
