const SILENCE_SCALE = 32768

export class StreamPlayer {
  protected _ctx: AudioContext | null = null
  protected _gain: GainNode | null = null
  protected _nextTime = 0
  protected _sampleRate = 16000
  protected _activeSources = new Set<AudioBufferSourceNode>()
  protected _inputEnded = false
  protected _streaming = false
  protected _generation = 0
  onDone: (() => void) | null = null

  start(params: { sampleRate: number; startDelayMs?: number }): void {
    this._generation += 1
    this._streaming = true
    this._inputEnded = false
    this._activeSources.clear()
    this._sampleRate = params.sampleRate
    this._ensureContext()
    this._nextTime = (this._ctx?.currentTime ?? 0) + (params.startDelayMs ?? 0) / 1000
    void this._ctx?.resume()
  }

  feed(samples: Uint8Array): void {
    if (!this._streaming) {
      return
    }
    const ctx = this._ctx
    const gain = this._gain
    if (!ctx || !gain) {
      return
    }
    const evenLength = samples.byteLength & ~1
    if (evenLength === 0) {
      return
    }
    const capturedGeneration = this._generation
    const int16 = new Int16Array(samples.buffer, samples.byteOffset, evenLength / 2)
    const floats = Float32Array.from(int16, (sample) => {
      return sample / SILENCE_SCALE
    })
    const buffer = ctx.createBuffer(1, floats.length, this._sampleRate)
    buffer.copyToChannel(floats, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const startAt = Math.max(ctx.currentTime, this._nextTime)
    source.connect(gain)
    source.start(startAt)
    this._nextTime = startAt + buffer.duration
    source.onended = () => {
      if (this._generation !== capturedGeneration) {
        return
      }
      this._activeSources.delete(source)
      this._maybeFireDone()
    }
    this._activeSources.add(source)
  }

  end(): void {
    if (!this._streaming) {
      return
    }
    this._inputEnded = true
    this._maybeFireDone()
  }

  stop(): void {
    this._generation += 1
    this._streaming = false
    this.onDone = null
    this._inputEnded = false
    this._activeSources.forEach((source) => {
      source.onended = null
      try {
        source.stop()
      } catch {
        return undefined
      }
    })
    this._activeSources.clear()
    this._nextTime = 0
  }

  protected _ensureContext(): void {
    if (this._ctx) {
      return
    }
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    this._ctx = ctx
    this._gain = gain
  }

  protected _maybeFireDone(): void {
    if (!this._inputEnded) {
      return
    }
    if (this._activeSources.size > 0) {
      return
    }
    if (!this.onDone) {
      return
    }
    const callback = this.onDone
    this.onDone = null
    callback()
  }
}
