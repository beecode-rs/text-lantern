import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathsService } from '@src/main/util/paths-service'
import { textService } from '@src/main/business/service/text-service'
import { langService } from '@src/main/util/lang-service'
import { selectionService } from '@src/main/business/service/selection-service'
import type { Lang, Settings, TtsStatus } from '@src/shared/types'

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

function _newTempWavPath(): string {
  return path.join(os.tmpdir(), `text-lantern-${process.pid}-${Date.now()}.wav`)
}

function _buildPiperSynthesisArgs(params: {
  onnx: string
  json: string
  wavPath: string
  rate: number
}): string[] {
  return ['-m', params.onnx, '-c', params.json, '-f', params.wavPath, '--length-scale', String(params.rate)]
}

function _synthesizeViaPiper(params: {
  args: string[]
  stdinText: string
}): Promise<{ stderr: string }> {
  let stderr = ''
  return new Promise<{ stderr: string }>((resolve) => {
    let child: ChildProcess
    try {
      child = spawn(pathsService.piperBin(), params.args, { stdio: ['pipe', 'ignore', 'pipe'] })
    } catch (err) {
      resolve({ stderr: String(err) })
      return
    }
    current = child
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('error', (err) => {
      stderr += String(err)
      resolve({ stderr })
    })
    child.on('exit', () => {
      resolve({ stderr })
    })
    child.stdin?.end(params.stdinText)
  })
}

function _announceSynthesisResult(params: {
  wavPath: string
  stderr: string
  voice: string
}): void {
  const wavHasAudio = fs.existsSync(params.wavPath) && fs.statSync(params.wavPath).size > 0
  if (wavHasAudio) {
    _emitTtsStatus({ state: 'reading', voice: params.voice })
    ttsEvents.emit('playWav', params.wavPath)
    return
  }
  _emitTtsStatus({
    state: 'error',
    error: (params.stderr || 'Piper produced no audio.').trim()
  })
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

    const wavPath = _newTempWavPath()
    const { onnx, json } = _voiceModelPaths({ voice })
    const args = _buildPiperSynthesisArgs({ onnx, json, wavPath, rate: opts.settings.rate })
    const { stderr } = await _synthesizeViaPiper({ args, stdinText: capped })

    current = null
    _announceSynthesisResult({ wavPath, stderr, voice })
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
