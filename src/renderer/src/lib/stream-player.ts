const SILENCE_SCALE = 32768

export class StreamPlayer {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private nextTime = 0
  private sampleRate = 16000
  private activeSources = new Set<AudioBufferSourceNode>()
  private inputEnded = false
  private streaming = false
  private generation = 0
  onDone: (() => void) | null = null

  start(params: { sampleRate: number }): void {
    this.generation += 1
    this.streaming = true
    this.inputEnded = false
    this.activeSources.clear()
    this.nextTime = 0
    this.sampleRate = params.sampleRate
    this._ensureContext()
    void this.ctx?.resume()
  }

  feed(samples: Uint8Array): void {
    if (!this.streaming) {
      return
    }
    const ctx = this.ctx
    const gain = this.gain
    if (!ctx || !gain) {
      return
    }
    const evenLength = samples.byteLength & ~1
    if (evenLength === 0) {
      return
    }
    const capturedGeneration = this.generation
    const int16 = new Int16Array(samples.buffer, samples.byteOffset, evenLength / 2)
    const floats = Float32Array.from(int16, (sample) => {
      return sample / SILENCE_SCALE
    })
    const buffer = ctx.createBuffer(1, floats.length, this.sampleRate)
    buffer.copyToChannel(floats, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const startAt = Math.max(ctx.currentTime, this.nextTime)
    source.connect(gain)
    source.start(startAt)
    this.nextTime = startAt + buffer.duration
    source.onended = () => {
      if (this.generation !== capturedGeneration) {
        return
      }
      this.activeSources.delete(source)
      this._maybeFireDone()
    }
    this.activeSources.add(source)
  }

  end(): void {
    if (!this.streaming) {
      return
    }
    this.inputEnded = true
    this._maybeFireDone()
  }

  stop(): void {
    this.generation += 1
    this.streaming = false
    this.onDone = null
    this.inputEnded = false
    this.activeSources.forEach((source) => {
      source.onended = null
      try {
        source.stop()
      } catch {}
    })
    this.activeSources.clear()
    this.nextTime = 0
  }

  private _ensureContext(): void {
    if (this.ctx) {
      return
    }
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    this.ctx = ctx
    this.gain = gain
  }

  private _maybeFireDone(): void {
    if (!this.inputEnded) {
      return
    }
    if (this.activeSources.size > 0) {
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
