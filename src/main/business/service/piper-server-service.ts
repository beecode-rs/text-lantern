import { spawn, type ChildProcess } from 'node:child_process'
import { pathsService } from '@src/main/util/paths-service'

const MSG_READY = 0x01
const MSG_AUDIO = 0x02
const MSG_END = 0x03
const MSG_ERROR = 0x04

const DEFAULT_SAMPLE_RATE = 16000
const CANCEL_GRACE_MS = 800
const STARTUP_MAX_ATTEMPTS = 3
const STARTUP_TIMEOUT_MS = 15000
const STDERR_TAIL_CHARS = 2000

interface Frame {
  type: number
  payload: Buffer
}

class FrameReader {
  private buffer: Buffer = Buffer.alloc(0)
  private readonly onFrame: (frame: Frame) => void

  constructor(onFrame: (frame: Frame) => void) {
    this.onFrame = onFrame
  }

  push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    this._drain()
  }

  private _drain(): void {
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0)
      if (length <= 0 || this.buffer.length < 4 + length) {
        return
      }
      const body = this.buffer.subarray(4, 4 + length)
      this.buffer = this.buffer.subarray(4 + length)
      this.onFrame({ type: body[0], payload: Buffer.from(body.subarray(1)) })
    }
  }
}

let child: ChildProcess | null = null
let currentModelPath: string | null = null
let sampleRate = DEFAULT_SAMPLE_RATE
let busy = false
let dead = false
let stderrTail = ''
let readyResolve: ((value: { sampleRate: number }) => void) | null = null
let readyReject: ((error: Error) => void) | null = null
let readyPromise: Promise<{ sampleRate: number }> | null = null
let idleResolve: (() => void) | null = null
let ensureChain: Promise<unknown> = Promise.resolve()

const queue: Frame[] = []
const waiters: Array<(frame: Frame) => void> = []

function _noop(): void {}

function _safeParseJson(payload: Buffer): Record<string, unknown> | null {
  try {
    return JSON.parse(payload.toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function _handleFrame(frame: Frame): void {
  if (frame.type === MSG_READY) {
    const parsed = _safeParseJson(frame.payload)
    const rate = parsed?.sample_rate
    sampleRate = typeof rate === 'number' && rate > 0 ? rate : DEFAULT_SAMPLE_RATE
    if (readyResolve) {
      const resolve = readyResolve
      readyResolve = null
      readyReject = null
      resolve({ sampleRate })
    }
    return
  }

  const waiter = waiters.shift()
  if (waiter) {
    waiter(frame)
    return
  }
  queue.push(frame)
}

function _setBusy(value: boolean): void {
  busy = value
  if (!value && idleResolve) {
    const resolve = idleResolve
    idleResolve = null
    resolve()
  }
}

function _nextFrame(): Promise<Frame> {
  return new Promise((resolve) => {
    const queued = queue.shift()
    if (queued) {
      resolve(queued)
      return
    }
    waiters.push(resolve)
  })
}

function _writeRequest(params: { text: string; lengthScale: number }): void {
  const stdin = child?.stdin
  if (!stdin) {
    throw new Error('Piper server is not running')
  }
  const request = JSON.stringify({ text: params.text, length_scale: params.lengthScale })
  stdin.write(`${request}\n`)
}

function _waitForIdle(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (!busy) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      idleResolve = null
      resolve()
    }, timeoutMs)
    idleResolve = () => {
      clearTimeout(timer)
      resolve()
    }
  })
}

function _rejectWaiter(error: Error): void {
  const waiter = waiters.shift()
  if (waiter) {
    waiter({ type: MSG_ERROR, payload: Buffer.from(error.message, 'utf8') })
  }
}

function _rejectReady(error: Error): void {
  if (readyReject) {
    const reject = readyReject
    readyResolve = null
    readyReject = null
    reject(error)
  }
}

function _killChild(): void {
  if (child) {
    try {
      child.kill('SIGTERM')
    } catch {}
  }
  _rejectReady(new Error('Piper server stopped'))
  child = null
  dead = true
  readyPromise = null
  _setBusy(false)
  _rejectWaiter(new Error('Piper server stopped'))
  queue.length = 0
}

function _formatExitError(): string {
  const detail = stderrTail.trim()
  if (detail) {
    return `Piper server exited during startup. ${detail}`
  }
  return 'Piper server exited during startup.'
}

function _spawn(modelPath: string): Promise<{ sampleRate: number }> {
  dead = false
  currentModelPath = modelPath
  stderrTail = ''
  queue.length = 0

  const reader = new FrameReader(_handleFrame)
  const proc = spawn(
    pathsService.venvPython(),
    [pathsService.piperServerScript(), modelPath],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  )
  child = proc

  proc.stdout?.on('data', (chunk: Buffer) => {
    if (proc !== child) {
      return
    }
    reader.push(chunk)
  })
  proc.stderr?.on('data', (chunk: Buffer) => {
    if (proc !== child) {
      return
    }
    stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_CHARS)
  })
  proc.on('error', (err) => {
    if (proc !== child) {
      return
    }
    dead = true
    _rejectReady(err instanceof Error ? err : new Error(String(err)))
  })
  proc.on('exit', () => {
    if (proc !== child) {
      return
    }
    const wasStarting = readyReject !== null
    dead = true
    child = null
    readyPromise = null
    if (wasStarting) {
      _rejectReady(new Error(_formatExitError()))
    }
    _rejectWaiter(new Error('Piper server exited unexpectedly'))
    _setBusy(false)
  })

  const promise = new Promise<{ sampleRate: number }>((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  readyPromise = promise
  return promise
}

function _startupTimeout(): Promise<{ sampleRate: number }> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Piper server startup timed out'))
    }, STARTUP_TIMEOUT_MS)
  })
}

async function _ensureReadySerialized(params: {
  modelPath: string
}): Promise<{ sampleRate: number }> {
  let attempt = 0
  let lastError: unknown = null
  while (attempt < STARTUP_MAX_ATTEMPTS) {
    attempt += 1
    if (child && !dead && currentModelPath === params.modelPath && readyPromise) {
      return readyPromise
    }
    if (child) {
      _killChild()
    }
    try {
      return await Promise.race([_spawn(params.modelPath), _startupTimeout()])
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Piper server failed to start')
}

function _ensureReady(params: { modelPath: string }): Promise<{ sampleRate: number }> {
  const result = ensureChain.then(() => {
    return _ensureReadySerialized(params)
  })
  ensureChain = result.then(_noop, _noop)
  return result
}

async function _cancelActive(): Promise<void> {
  if (!child || !busy) {
    return
  }
  try {
    child.kill('SIGUSR1')
  } catch {}
  await _waitForIdle(CANCEL_GRACE_MS)
  if (busy && child) {
    _killChild()
  }
}

function _dispose(): void {
  _killChild()
  currentModelPath = null
}

export const piperServerService = {
  ensureReady(params: { modelPath: string }): Promise<{ sampleRate: number }> {
    return _ensureReady(params)
  },

  async synthesize(
    params: { text: string; lengthScale: number },
    handlers: { onChunk: (chunk: Buffer) => void }
  ): Promise<void> {
    _setBusy(true)
    let synthesizing = true
    try {
      _writeRequest(params)
      while (synthesizing) {
        const frame = await _nextFrame()
        if (frame.type === MSG_AUDIO) {
          handlers.onChunk(Buffer.from(frame.payload))
        } else if (frame.type === MSG_END) {
          synthesizing = false
        } else if (frame.type === MSG_ERROR) {
          throw new Error(frame.payload.toString('utf8') || 'Piper synthesis failed')
        }
      }
    } finally {
      _setBusy(false)
    }
  },

  cancelActive(): Promise<void> {
    return _cancelActive()
  },

  isBusy(): boolean {
    return busy
  },

  dispose(): void {
    _dispose()
  }
}
