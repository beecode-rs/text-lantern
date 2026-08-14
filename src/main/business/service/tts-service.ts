import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { TextService } from '@src/main/business/service/text-service'
import { historyDalSingleton } from '@src/main/dal/history-dal'
import { piperServerServiceSingleton } from '@src/main/lib/piper-server-service'
import { SelectionService } from '@src/main/lib/selection-service'
import { constant } from '@src/main/util/constants'
import { langService } from '@src/main/util/lang-service'
import { pathsService } from '@src/main/util/paths-service'
import type { Lang, Settings, TtsStatus } from '@src/shared/types'

export class TtsService {
  public readonly events: EventEmitter

  private _active: object | null = null

  public constructor() {
    this.events = new EventEmitter()
    this.events.setMaxListeners(50)
  }

  public async prewarmVoice(params: { voice: string }): Promise<void> {
    if (!params.voice || !this._voiceModelFilesExist({ voice: params.voice })) {
      return
    }
    const { onnx } = this._voiceModelPaths({ voice: params.voice })
    try {
      await piperServerServiceSingleton().ensureReady({ modelPath: onnx })
    } catch {}
  }

  public async speak(params: { lang: Lang; text?: string; settings: Settings }): Promise<void> {
    await this.stop()

    let rawText: string
    try {
      rawText = await this._resolveInputText({ text: params.text })
    } catch (error) {
      this._emitTtsStatus({ state: 'error', error: this._selectionErrorMessage(error) })
      return
    }
    if (!this._hasText(rawText)) {
      this._emitIdle()
      return
    }

    const cleaned = this._cleanTextIfEnabled({ text: rawText, settings: params.settings })
    if (!this._hasText(cleaned)) {
      this._emitIdle()
      return
    }

    const capped = this._capTextToMaxLength({ text: cleaned, maxChars: params.settings.maxChars })
    const voice = langService.resolveVoice({
      lang: params.lang,
      text: cleaned,
      settings: params.settings
    })

    if (!this._voiceModelFilesExist({ voice })) {
      this._emitTtsStatus({
        state: 'error',
        error: `Voice "${voice}" is not downloaded. Open Settings → Models.`
      })
      return
    }

    const token: object = {}
    this._active = token
    this._emitTtsStatus({ state: 'synthesizing', voice })
    historyDalSingleton().add({ text: capped, voice })

    let sampleRate: number
    try {
      const ready = await piperServerServiceSingleton().ensureReady({
        modelPath: this._voiceModelPaths({ voice }).onnx
      })
      sampleRate = ready.sampleRate
    } catch (error) {
      if (this._active === token) {
        this._active = null
        this._emitTtsStatus({ state: 'error', error: this._errorMessage(error) })
      }
      return
    }

    if (this._active !== token) {
      return
    }

    void this._streamFromServer({
      text: capped,
      lengthScale: this._lengthScaleFromSpeed(params.settings.rate),
      sampleRate,
      voice,
      token
    })
  }

  public async stop(): Promise<void> {
    this._active = null
    this.events.emit('stopPlayback')
    this._emitIdle()
    await piperServerServiceSingleton().cancelActive()
  }

  public playbackEnded(): void {
    this._emitIdle()
  }

  public isReading(): boolean {
    return this._active !== null
  }

  public dispose(): void {
    piperServerServiceSingleton().dispose()
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
    return new SelectionService().grab()
  }

  protected _selectionErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return 'Could not read the selected text.'
  }

  protected _cleanTextIfEnabled(params: { text: string; settings: Settings }): string {
    if (params.settings.cleanText) {
      return new TextService().cleanText({
        input: params.text,
        stripBrackets: params.settings.stripBrackets
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

  protected _voiceModelPaths(params: { voice: string }): { onnx: string; json: string } {
    const onnx = path.join(pathsService.modelsDir(), `${params.voice}.onnx`)
    const json = path.join(pathsService.modelsDir(), `${params.voice}.onnx.json`)
    return { onnx, json }
  }

  protected _voiceModelFilesExist(params: { voice: string }): boolean {
    const { onnx, json } = this._voiceModelPaths({ voice: params.voice })
    return fs.existsSync(onnx) && fs.existsSync(json)
  }

  protected _lengthScaleFromSpeed(speed: number): number {
    if (speed > 0) {
      return 1 / speed
    }
    return 1
  }

  protected _errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  protected _forwardFrames(params: { remainder: Buffer; chunk: Buffer }): Buffer {
    let remainder = Buffer.concat([params.remainder, params.chunk])
    while (remainder.length >= constant().tts.audioFrameBytes) {
      const frame = remainder.subarray(0, constant().tts.audioFrameBytes)
      remainder = remainder.subarray(constant().tts.audioFrameBytes)
      this.events.emit('audioChunk', Buffer.from(frame))
    }
    return remainder
  }

  protected async _streamFromServer(params: {
    text: string
    lengthScale: number
    sampleRate: number
    voice: string
    token: object
  }): Promise<void> {
    let started = false
    let remainder: Buffer = Buffer.alloc(0)

    const onChunk = (chunk: Buffer): void => {
      if (this._active !== params.token) {
        return
      }
      if (!started) {
        started = true
        this._emitTtsStatus({ state: 'reading', voice: params.voice })
        this.events.emit('audioStart', { sampleRate: params.sampleRate, voice: params.voice })
      }
      remainder = this._forwardFrames({ remainder, chunk })
    }

    try {
      await piperServerServiceSingleton().synthesize(
        { text: params.text, lengthScale: params.lengthScale },
        { onChunk }
      )
      if (this._active !== params.token) {
        return
      }
      if (started) {
        if (remainder.length > 0) {
          this.events.emit('audioChunk', Buffer.from(remainder))
        }
        this.events.emit('audioEnd')
      } else {
        this._emitTtsStatus({ state: 'error', error: 'Piper produced no audio.' })
      }
    } catch (error) {
      if (this._active !== params.token) {
        return
      }
      this._emitTtsStatus({ state: 'error', error: this._errorMessage(error) })
    } finally {
      if (this._active === params.token) {
        this._active = null
      }
    }
  }
}

export const ttsServiceSingleton = singletonPattern(() => new TtsService())
