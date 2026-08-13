import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathsService } from '@src/main/util/paths-service'
import { textService } from '@src/main/business/service/text-service'
import { langService } from '@src/main/util/lang-service'
import { selectionService } from '@src/main/business/service/selection-service'
import type { Lang, Settings, TtsStatus } from '@src/shared/types'

const AUDIO_FRAME_BYTES = 4096
const DEFAULT_SAMPLE_RATE = 16000

const ttsEvents = new EventEmitter()
ttsEvents.setMaxListeners(50)

let current: ChildProcess | null = null

function _emitTtsStatus(status: TtsStatus): void {
  ttsEvents.emit('status', status)
}

function _emitIdle(): void {
  _emitTtsStatus({ state: 'idle' })
}

function _hasText(text: string): boolean {
  return text.length > 0
}

function _stopAnyActiveSynthesis(): void {
  if (!current) {
    return
  }
  try {
    current.kill('SIGTERM')
  } catch {}
  current = null
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

function _buildPiperSynthesisArgs(params: { onnx: string; json: string; speed: number }): string[] {
  return [
    '-m',
    params.onnx,
    '-c',
    params.json,
    '--output-raw',
    '--length-scale',
    String(_lengthScaleFromSpeed(params.speed))
  ]
}

async function _voiceSampleRate(params: { json: string }): Promise<number> {
  let rate = 0
  try {
    const content = await fs.promises.readFile(params.json, 'utf8')
    const parsed = JSON.parse(content) as { audio?: { sample_rate?: number } }
    rate = parsed.audio?.sample_rate ?? 0
  } catch {
    rate = 0
  }
  if (rate > 0) {
    return rate
  }
  return DEFAULT_SAMPLE_RATE
}

function _streamViaPiper(params: {
  args: string[]
  stdinText: string
  sampleRate: number
  voice: string
}): void {
  let child: ChildProcess
  try {
    child = spawn(pathsService.piperBin(), params.args, { stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (err) {
    _emitTtsStatus({ state: 'error', error: String(err) })
    return
  }
  current = child

  let stderr = ''
  let producedAudio = false
  let started = false
  let remainder = Buffer.alloc(0)

  const forwardFrames = (buf: Buffer): void => {
    if (current !== child) {
      return
    }
    if (!started) {
      started = true
      producedAudio = true
      _emitTtsStatus({ state: 'reading', voice: params.voice })
      ttsEvents.emit('audioStart', { sampleRate: params.sampleRate, voice: params.voice })
    }
    remainder = Buffer.concat([remainder, buf])
    while (remainder.length >= AUDIO_FRAME_BYTES) {
      const frame = remainder.subarray(0, AUDIO_FRAME_BYTES)
      remainder = remainder.subarray(AUDIO_FRAME_BYTES)
      ttsEvents.emit('audioChunk', Buffer.from(frame))
    }
  }

  child.stdout?.on('data', forwardFrames)
  child.stdout?.on('end', () => {
    if (current !== child) {
      return
    }
    if (remainder.length > 0) {
      ttsEvents.emit('audioChunk', Buffer.from(remainder))
      remainder = Buffer.alloc(0)
    }
    if (producedAudio) {
      ttsEvents.emit('audioEnd')
    }
  })
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString()
  })
  child.on('error', (err) => {
    if (current !== child) {
      return
    }
    if (!producedAudio) {
      _emitTtsStatus({ state: 'error', error: String(err) })
    }
  })
  child.on('exit', () => {
    if (current !== child) {
      return
    }
    current = null
    if (!producedAudio) {
      _emitTtsStatus({
        state: 'error',
        error: (stderr || 'Piper produced no audio.').trim()
      })
    }
  })
  child.stdin?.end(params.stdinText)
}

export const ttsService = {
  events: ttsEvents,

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
        error: `Voice “${voice}” is not downloaded. Open Settings → Models.`
      })
      return
    }

    _emitTtsStatus({ state: 'synthesizing', voice })

    const { onnx, json } = _voiceModelPaths({ voice })
    const sampleRate = await _voiceSampleRate({ json })
    const args = _buildPiperSynthesisArgs({ onnx, json, speed: opts.settings.rate })
    _streamViaPiper({ args, stdinText: capped, sampleRate, voice })
  },

  async stop(): Promise<void> {
    _stopAnyActiveSynthesis()
    ttsEvents.emit('stopPlayback')
    _emitIdle()
  },

  playbackEnded(): void {
    _emitIdle()
  },

  isReading(): boolean {
    return current !== null
  }
}
