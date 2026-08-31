import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { EventEmitter } from 'node:events'

import { TextService } from '#src/main/business/service/text-service'
import { historyDalSingleton } from '#src/main/dal/history-dal'
import { Selection } from '#src/main/lib/selection'
import { ttsProviderRegistrySingleton } from '#src/main/lib/tts/provider-registry'
import type { TtsProviderAdapter } from '#src/main/lib/tts/tts-provider'
import { constant } from '#src/main/util/constants'
import { langUtil } from '#src/main/util/lang-util'
import type { Lang, Settings, TtsStatus } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export class TtsService {
  readonly events: EventEmitter

  protected _active: object | null = null

  protected _activeProvider: TtsProviderAdapter | null = null

  constructor() {
    this.events = new EventEmitter()
    this.events.setMaxListeners(50)
  }

  async prewarmVoice(params: { voice: string }): Promise<void> {
    try {
      if (!params.voice) {
        return
      }
      const { provider: voiceProvider } = voiceIdParser.parse({ id: params.voice })
      const provider = ttsProviderRegistrySingleton().providerFor({ provider: voiceProvider })
      if (!provider.hasVoiceModelFiles({ voice: params.voice })) {
        return
      }
      await provider.ensureReadyForVoice({ voice: params.voice })
    } catch {
      return
    }
  }

  async speak(params: { lang: Lang; text?: string; shouldSkipHistory?: boolean; settings: Settings }): Promise<void> {
    await this.stop()

    let rawText: string
    try {
      rawText = await this._resolveInputText({ text: params.text })
    } catch (error) {
      this._emitTtsStatus({ error: this._selectionErrorMessage(error), state: 'error' })

      return
    }
    if (!this._hasText(rawText)) {
      this._emitIdle()

      return
    }

    const cleaned = this._cleanTextIfEnabled({ settings: params.settings, text: rawText })
    if (!this._hasText(cleaned)) {
      this._emitIdle()

      return
    }

    const capped = this._capTextToMaxLength({ maxChars: params.settings.maxChars, text: cleaned })
    const voice = langUtil.resolveVoice({
      lang: params.lang,
      settings: params.settings,
      text: cleaned,
    })

    if (!voice) {
      this._emitTtsStatus({
        error: 'No language is set up yet. Open Settings → Languages.',
        state: 'error',
      })

      return
    }

    const { provider: voiceProvider } = voiceIdParser.parse({ id: voice })
    const provider = ttsProviderRegistrySingleton().providerFor({ provider: voiceProvider })

    if (!provider.hasVoiceModelFiles({ voice })) {
      this._emitTtsStatus({
        error: `Voice "${voice}" is not downloaded. Open Settings → Models.`,
        state: 'error',
      })

      return
    }

    const token: object = {}
    this._active = token
    this._activeProvider = provider
    this._emitTtsStatus({ state: 'synthesizing', voice })
    if (!params.shouldSkipHistory) {
      historyDalSingleton().add({ text: capped, voice })
    }

    let sampleRate: number
    try {
      const ready = await provider.ensureReadyForVoice({ voice })
      sampleRate = ready.sampleRate
    } catch (error) {
      if (this._active === token) {
        this._active = null
        this._emitTtsStatus({ error: this._errorMessage(error), state: 'error' })
      }

      return
    }

    if (this._active !== token) {
      return
    }

    void this._streamFromServer({
      provider,
      sampleRate,
      speed: params.settings.rate,
      text: capped,
      token,
      voice,
    })
  }

  async stop(): Promise<void> {
    const provider = this._activeProvider
    this._active = null
    this._activeProvider = null
    this.events.emit('stopPlayback')
    this._emitIdle()
    await provider?.cancelActive()
  }

  playbackEnded(): void {
    this._emitIdle()
  }

  isReading(): boolean {
    return this._active !== null
  }

  dispose(): void {
    ttsProviderRegistrySingleton().disposeAll()
  }

  protected _emitTtsStatus(status: TtsStatus): void {
    this.events.emit('status', status)
  }

  protected _emitIdle(): void {
    this._emitTtsStatus({ state: 'idle' })
  }

  protected _hasText(text: string): boolean {
    return text.length > 0
  }

  protected async _resolveInputText(params: { text?: string }): Promise<string> {
    if (params.text) {
      return params.text
    }

    return new Selection().grab()
  }

  protected _selectionErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    return 'Could not read the selected text.'
  }

  protected _cleanTextIfEnabled(params: { text: string; settings: Settings }): string {
    if (params.settings.shouldCleanText) {
      return new TextService().cleanText({
        input: params.text,
        shouldStripBrackets: params.settings.shouldStripBrackets,
      })
    }

    return params.text.trim()
  }

  protected _capTextToMaxLength(params: { text: string; maxChars: number }): string {
    if (params.maxChars > 0 && params.text.length > params.maxChars) {
      return `${params.text.slice(0, params.maxChars)} …`
    }

    return params.text
  }

  protected _errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }

  protected _forwardFrames(params: { remainder: Buffer; chunk: Buffer }): Buffer {
    return this._emitFrames(Buffer.concat([params.remainder, params.chunk]))
  }

  protected _emitFrames(remainder: Buffer): Buffer {
    if (remainder.length < constant().tts.audioFrameBytes) {
      return remainder
    }
    const frame = remainder.subarray(0, constant().tts.audioFrameBytes)
    const rest = remainder.subarray(constant().tts.audioFrameBytes)
    this.events.emit('audioChunk', Buffer.from(frame))

    return this._emitFrames(rest)
  }

  protected async _streamFromServer(params: {
    provider: TtsProviderAdapter
    sampleRate: number
    speed: number
    text: string
    token: object
    voice: string
  }): Promise<void> {
    const streamState = { isStarted: false }
    let remainder: Buffer = Buffer.alloc(0)

    const onChunk = (chunk: Buffer): void => {
      if (this._active !== params.token) {
        return
      }
      if (!streamState.isStarted) {
        streamState.isStarted = true
        this._emitTtsStatus({ state: 'reading', voice: params.voice })
        this.events.emit('audioStart', { sampleRate: params.sampleRate, voice: params.voice })
      }
      remainder = this._forwardFrames({ chunk, remainder })
    }

    try {
      await params.provider.synthesize({ onChunk, speed: params.speed, text: params.text, voice: params.voice })
      if (this._active !== params.token) {
        return
      }
      if (streamState.isStarted) {
        if (remainder.length > 0) {
          this.events.emit('audioChunk', Buffer.from(remainder))
        }
        this.events.emit('audioEnd')
      } else {
        this._emitTtsStatus({ error: `${params.provider.provider} produced no audio.`, state: 'error' })
      }
    } catch (error) {
      if (this._active !== params.token) {
        return
      }
      this._emitTtsStatus({ error: this._errorMessage(error), state: 'error' })
    } finally {
      if (this._active === params.token) {
        this._active = null
      }
    }
  }
}

export const ttsServiceSingleton = singletonPattern(() => new TtsService())
