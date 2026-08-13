import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { piperServerService } from '@src/main/business/service/piper-server-service'
import { selectionService } from '@src/main/business/service/selection-service'
import { textService } from '@src/main/business/service/text-service'
import { langService } from '@src/main/util/lang-service'
import { pathsService } from '@src/main/util/paths-service'
import type { Lang, Settings, TtsStatus } from '@src/shared/types'

const AUDIO_FRAME_BYTES = 4096

const ttsEvents = new EventEmitter()
ttsEvents.setMaxListeners(50)

let active: object | null = null

function _emitTtsStatus(status: TtsStatus): void {
  ttsEvents.emit('status', status)
}

function _emitIdle(): void {
  _emitTtsStatus({ state: 'idle' })
}

function _hasText(text: string): boolean {
  return text.length > 0
}

async function _resolveInputText(params: { text?: string }): Promise<string> {
  if (params.text) {
    return params.text
  }
  return selectionService.grab()
}

function _selectionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Could not read the selected text.'
}

function _cleanTextIfEnabled(params: { text: string; settings: Settings }): string {
  if (params.settings.cleanText) {
    return textService.cleanText({
      input: params.text,
      stripBrackets: params.settings.stripBrackets
    })
  }
  return params.text.trim()
}

function _capTextToMaxLength(params: { text: string; maxChars: number }): string {
  if (params.maxChars > 0 && params.text.length > params.maxChars) {
    return `${params.text.slice(0, params.maxChars)} …`
  }
  return params.text
}

function _voiceModelPaths(params: { voice: string }): { onnx: string; json: string } {
  const onnx = path.join(pathsService.modelsDir(), `${params.voice}.onnx`)
  const json = path.join(pathsService.modelsDir(), `${params.voice}.onnx.json`)
  return { onnx, json }
}

function _voiceModelFilesExist(params: { voice: string }): boolean {
  const { onnx, json } = _voiceModelPaths({ voice: params.voice })
  return fs.existsSync(onnx) && fs.existsSync(json)
}

function _lengthScaleFromSpeed(speed: number): number {
  if (speed > 0) {
    return 1 / speed
  }
  return 1
}

function _errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function _forwardFrames(params: { remainder: Buffer; chunk: Buffer }): Buffer {
  let remainder = Buffer.concat([params.remainder, params.chunk])
  while (remainder.length >= AUDIO_FRAME_BYTES) {
    const frame = remainder.subarray(0, AUDIO_FRAME_BYTES)
    remainder = remainder.subarray(AUDIO_FRAME_BYTES)
    ttsEvents.emit('audioChunk', Buffer.from(frame))
  }
  return remainder
}

async function _streamFromServer(params: {
  text: string
  lengthScale: number
  sampleRate: number
  voice: string
  token: object
}): Promise<void> {
  let started = false
  let remainder: Buffer = Buffer.alloc(0)

  const onChunk = (chunk: Buffer): void => {
    if (active !== params.token) {
      return
    }
    if (!started) {
      started = true
      _emitTtsStatus({ state: 'reading', voice: params.voice })
      ttsEvents.emit('audioStart', { sampleRate: params.sampleRate, voice: params.voice })
    }
    remainder = _forwardFrames({ remainder, chunk })
  }

  try {
    await piperServerService.synthesize(
      { text: params.text, lengthScale: params.lengthScale },
      { onChunk }
    )
    if (active !== params.token) {
      return
    }
    if (started) {
      if (remainder.length > 0) {
        ttsEvents.emit('audioChunk', Buffer.from(remainder))
      }
      ttsEvents.emit('audioEnd')
    } else {
      _emitTtsStatus({ state: 'error', error: 'Piper produced no audio.' })
    }
  } catch (error) {
    if (active !== params.token) {
      return
    }
    _emitTtsStatus({ state: 'error', error: _errorMessage(error) })
  } finally {
    if (active === params.token) {
      active = null
    }
  }
}

export const ttsService = {
  events: ttsEvents,

  async prewarmVoice(params: { voice: string }): Promise<void> {
    if (!params.voice || !_voiceModelFilesExist({ voice: params.voice })) {
      return
    }
    const { onnx } = _voiceModelPaths({ voice: params.voice })
    try {
      await piperServerService.ensureReady({ modelPath: onnx })
    } catch {}
  },

  async speak(opts: { lang: Lang; text?: string; settings: Settings }): Promise<void> {
    await this.stop()

    let rawText: string
    try {
      rawText = await _resolveInputText({ text: opts.text })
    } catch (error) {
      _emitTtsStatus({ state: 'error', error: _selectionErrorMessage(error) })
      return
    }
    if (!_hasText(rawText)) {
      _emitIdle()
      return
    }

    const cleaned = _cleanTextIfEnabled({ text: rawText, settings: opts.settings })
    if (!_hasText(cleaned)) {
      _emitIdle()
      return
    }

    const capped = _capTextToMaxLength({ text: cleaned, maxChars: opts.settings.maxChars })
    const voice = langService.resolveVoice({
      lang: opts.lang,
      text: cleaned,
      settings: opts.settings
    })

    if (!_voiceModelFilesExist({ voice })) {
      _emitTtsStatus({
        state: 'error',
        error: `Voice "${voice}" is not downloaded. Open Settings → Models.`
      })
      return
    }

    const token: object = {}
    active = token
    _emitTtsStatus({ state: 'synthesizing', voice })

    let sampleRate: number
    try {
      const ready = await piperServerService.ensureReady({
        modelPath: _voiceModelPaths({ voice }).onnx
      })
      sampleRate = ready.sampleRate
    } catch (error) {
      if (active === token) {
        active = null
        _emitTtsStatus({ state: 'error', error: _errorMessage(error) })
      }
      return
    }

    if (active !== token) {
      return
    }

    void _streamFromServer({
      text: capped,
      lengthScale: _lengthScaleFromSpeed(opts.settings.rate),
      sampleRate,
      voice,
      token
    })
  },

  async stop(): Promise<void> {
    active = null
    ttsEvents.emit('stopPlayback')
    _emitIdle()
    await piperServerService.cancelActive()
  },

  playbackEnded(): void {
    _emitIdle()
  },

  isReading(): boolean {
    return active !== null
  },

  dispose(): void {
    piperServerService.dispose()
  }
}
