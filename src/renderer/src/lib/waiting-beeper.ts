const FIRST_BLEEP_DELAY_MS = 1000
const BLEEP_INTERVAL_MS = 1200
const BLEEP_DURATION_MS = 500
const BLEEP_ATTACK_MS = 70
const BLEEP_BASE_FREQUENCY_HZ = 392
const BLEEP_VOLUME = 0.07
const PREVIEW_BLEEP_COUNT = 1

const BLEEP_LAYERS: { frequencyFactor: number; gain: number }[] = [
  { frequencyFactor: 0.5, gain: 0.45 },
  { frequencyFactor: 1, gain: 1 },
  { frequencyFactor: 2, gain: 0.18 },
]

export class WaitingBeeper {
  protected _ctx: AudioContext | null = null
  protected _delayTimer: ReturnType<typeof setTimeout> | null = null
  protected _intervalTimer: ReturnType<typeof setInterval> | null = null
  protected _isWaiting = false

  start(): void {
    if (this._isWaiting) {
      return
    }
    this._isWaiting = true
    this._delayTimer = setTimeout(() => {
      this._startBeeping()
    }, FIRST_BLEEP_DELAY_MS)
  }

  stop(): void {
    this._isWaiting = false
    this._clearTimers()
  }

  preview(): void {
    const ctx = this._ensureContext()
    void ctx.resume()
    const firstAt = ctx.currentTime + 0.05
    Array.from({ length: PREVIEW_BLEEP_COUNT }, (_unused, index) => {
      this._scheduleBeep({ atSec: firstAt + (index * BLEEP_INTERVAL_MS) / 1000, ctx })
    })
  }

  protected _startBeeping(): void {
    this._beepOnce()
    this._intervalTimer = setInterval(() => {
      this._beepOnce()
    }, BLEEP_INTERVAL_MS)
  }

  protected _beepOnce(): void {
    const ctx = this._ensureContext()
    void ctx.resume()
    this._scheduleBeep({ atSec: ctx.currentTime, ctx })
  }

  protected _scheduleBeep(params: { atSec: number; ctx: AudioContext }): void {
    const { atSec, ctx } = params
    const durationSec = BLEEP_DURATION_MS / 1000
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, atSec)
    envelope.gain.exponentialRampToValueAtTime(BLEEP_VOLUME, atSec + BLEEP_ATTACK_MS / 1000)
    envelope.gain.exponentialRampToValueAtTime(0.0001, atSec + durationSec)
    envelope.connect(ctx.destination)
    BLEEP_LAYERS.forEach((layer) => {
      const osc = ctx.createOscillator()
      const layerGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = BLEEP_BASE_FREQUENCY_HZ * layer.frequencyFactor
      layerGain.gain.value = layer.gain
      osc.connect(layerGain)
      layerGain.connect(envelope)
      osc.start(atSec)
      osc.stop(atSec + durationSec + 0.05)
    })
  }

  protected _ensureContext(): AudioContext {
    this._ctx ??= new AudioContext()

    return this._ctx
  }

  protected _clearTimers(): void {
    if (this._delayTimer !== null) {
      clearTimeout(this._delayTimer)
      this._delayTimer = null
    }
    if (this._intervalTimer !== null) {
      clearInterval(this._intervalTimer)
      this._intervalTimer = null
    }
  }
}
