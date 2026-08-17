import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { type Frame, FrameReader } from '@src/main/lib/piper/_frame-reader'
import { constant } from '@src/main/util/constants'
import { pathUtil } from '@src/main/util/path-util'
import { type ChildProcess, spawn } from 'node:child_process'

const MSG_READY = 0x01
const MSG_AUDIO = 0x02
const MSG_END = 0x03
const MSG_ERROR = 0x04

export class PiperServer {
  protected _child: ChildProcess | null = null
  protected _currentModelPath: string | null = null
  protected _sampleRate: number = constant().piperServer.defaultSampleRateHz
  protected _busy = false
  protected _dead = false
  protected _stderrTail = ''
  protected _readyResolve: ((value: { sampleRate: number }) => void) | null = null
  protected _readyReject: ((error: Error) => void) | null = null
  protected _readyPromise: Promise<{ sampleRate: number }> | null = null
  protected _idleResolve: (() => void) | null = null
  protected _ensureChain: Promise<unknown> = Promise.resolve()
  protected readonly _queue: Frame[] = []
  protected readonly _waiters: ((frame: Frame) => void)[] = []

  ensureReady(params: { modelPath: string }): Promise<{ sampleRate: number }> {
    return this._ensureReady(params)
  }

  async synthesize(
    params: { text: string; lengthScale: number },
    handlers: { onChunk: (chunk: Buffer) => void },
  ): Promise<void> {
    this._setBusy(true)
    try {
      this._writeRequest(params)
      await this._pumpAudioFrames(handlers)
    } finally {
      this._setBusy(false)
    }
  }

  cancelActive(): Promise<void> {
    return this._cancelActive()
  }

  isBusy(): boolean {
    return this._busy
  }

  dispose(): void {
    this._dispose()
  }

  protected async _pumpAudioFrames(handlers: { onChunk: (chunk: Buffer) => void }): Promise<void> {
    const frame = await this._nextFrame()
    if (frame.type === MSG_AUDIO) {
      handlers.onChunk(Buffer.from(frame.payload))

      return this._pumpAudioFrames(handlers)
    }
    if (frame.type === MSG_END) {
      return Promise.resolve()
    }
    if (frame.type === MSG_ERROR) {
      throw new Error(frame.payload.toString('utf8') || 'Piper synthesis failed')
    }

    return this._pumpAudioFrames(handlers)
  }

  protected _noop(): void {
    return undefined
  }

  protected _safeParseJson(payload: Buffer): Record<string, unknown> | null {
    try {
      return JSON.parse(payload.toString('utf8')) as Record<string, unknown>
    } catch {
      return null
    }
  }

  protected _handleFrame(frame: Frame): void {
    if (frame.type === MSG_READY) {
      const parsed = this._safeParseJson(frame.payload)
      const rate = parsed?.sample_rate
      if (typeof rate === 'number' && rate > 0) {
        this._sampleRate = rate
      } else {
        this._sampleRate = constant().piperServer.defaultSampleRateHz
      }
      if (this._readyResolve) {
        const resolve = this._readyResolve
        this._readyResolve = null
        this._readyReject = null
        resolve({ sampleRate: this._sampleRate })
      }

      return
    }

    const waiter = this._waiters.shift()
    if (waiter) {
      waiter(frame)

      return
    }
    this._queue.push(frame)
  }

  protected _setBusy(value: boolean): void {
    this._busy = value
    if (!value && this._idleResolve) {
      const resolve = this._idleResolve
      this._idleResolve = null
      resolve()
    }
  }

  protected _nextFrame(): Promise<Frame> {
    return new Promise((resolve) => {
      const queued = this._queue.shift()
      if (queued) {
        resolve(queued)

        return
      }
      this._waiters.push(resolve)
    })
  }

  protected _writeRequest(params: { text: string; lengthScale: number }): void {
    const stdin = this._child?.stdin
    if (!stdin) {
      throw new Error('Piper server is not running')
    }
    const payload: Record<string, unknown> = { text: params.text }
    payload['length_scale'] = params.lengthScale
    const request = JSON.stringify(payload)
    stdin.write(`${request}\n`)
  }

  protected _waitForIdle(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this._busy) {
        resolve()

        return
      }
      const timer = setTimeout(() => {
        this._idleResolve = null
        resolve()
      }, timeoutMs)
      this._idleResolve = () => {
        clearTimeout(timer)
        resolve()
      }
    })
  }

  protected _rejectWaiter(error: Error): void {
    const waiter = this._waiters.shift()
    if (waiter) {
      waiter({ payload: Buffer.from(error.message, 'utf8'), type: MSG_ERROR })
    }
  }

  protected _rejectReady(error: Error): void {
    if (this._readyReject) {
      const reject = this._readyReject
      this._readyResolve = null
      this._readyReject = null
      reject(error)
    }
  }

  protected _killChild(): void {
    if (this._child) {
      try {
        this._child.kill('SIGTERM')
      } catch {
        this._noop()
      }
    }
    this._rejectReady(new Error('Piper server stopped'))
    this._child = null
    this._dead = true
    this._readyPromise = null
    this._setBusy(false)
    this._rejectWaiter(new Error('Piper server stopped'))
    this._queue.length = 0
  }

  protected _formatExitError(): string {
    const detail = this._stderrTail.trim()
    if (detail) {
      return `Piper server exited during startup. ${detail}`
    }

    return 'Piper server exited during startup.'
  }

  protected _spawn(modelPath: string): Promise<{ sampleRate: number }> {
    this._dead = false
    this._currentModelPath = modelPath
    this._stderrTail = ''
    this._queue.length = 0

    const reader = new FrameReader((frame) => {
      this._handleFrame(frame)
    })
    const proc = spawn(pathUtil.venvPython(), [pathUtil.piperServerScript(), modelPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this._child = proc

    proc.stdout.on('data', (chunk: Buffer) => {
      if (proc !== this._child) {
        return
      }
      reader.push(chunk)
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      if (proc !== this._child) {
        return
      }
      this._stderrTail = (this._stderrTail + chunk.toString()).slice(-constant().piperServer.stderrTailChars)
    })
    proc.on('error', (err) => {
      if (proc !== this._child) {
        return
      }
      this._dead = true
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
      const wasStarting = this._readyReject !== null
      this._dead = true
      this._child = null
      this._readyPromise = null
      if (wasStarting) {
        this._rejectReady(new Error(this._formatExitError()))
      }
      this._rejectWaiter(new Error('Piper server exited unexpectedly'))
      this._setBusy(false)
    })

    const promise = new Promise<{ sampleRate: number }>((resolve, reject) => {
      this._readyResolve = resolve
      this._readyReject = reject
    })
    this._readyPromise = promise

    return promise
  }

  protected _startupTimeout(): Promise<{ sampleRate: number }> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Piper server startup timed out'))
      }, constant().piperServer.startupTimeoutMs)
    })
  }

  protected async _ensureReadySerialized(params: { modelPath: string }): Promise<{ sampleRate: number }> {
    return this._spawnUntilReady({
      attemptLeft: constant().piperServer.startupMaxAttempts,
      modelPath: params.modelPath,
      previousError: null,
    })
  }

  protected async _spawnUntilReady(params: {
    attemptLeft: number
    modelPath: string
    previousError: unknown
  }): Promise<{ sampleRate: number }> {
    if (params.attemptLeft <= 0) {
      if (params.previousError instanceof Error) {
        throw params.previousError
      }
      throw new Error('Piper server failed to start')
    }
    if (this._child && !this._dead && this._currentModelPath === params.modelPath && this._readyPromise) {
      return this._readyPromise
    }
    if (this._child) {
      this._killChild()
    }
    try {
      return await Promise.race([this._spawn(params.modelPath), this._startupTimeout()])
    } catch (error) {
      return this._spawnUntilReady({
        attemptLeft: params.attemptLeft - 1,
        modelPath: params.modelPath,
        previousError: error,
      })
    }
  }

  protected _ensureReady(params: { modelPath: string }): Promise<{ sampleRate: number }> {
    const result = this._ensureChain.then(() => {
      return this._ensureReadySerialized(params)
    })
    this._ensureChain = result.then(
      () => {
        this._noop()
      },
      () => {
        this._noop()
      },
    )

    return result
  }

  protected async _cancelActive(): Promise<void> {
    if (!this._child || !this._busy) {
      return
    }
    try {
      this._child.kill('SIGUSR1')
    } catch {
      this._noop()
    }
    await this._waitForIdle(constant().piperServer.cancelGraceMs)
    this._killChildIfStillBusy()
  }

  protected _killChildIfStillBusy(): void {
    if (this._busy && this._child) {
      this._killChild()
    }
  }

  protected _dispose(): void {
    this._killChild()
    this._currentModelPath = null
  }
}

export const piperServerSingleton = singletonPattern(() => new PiperServer())
