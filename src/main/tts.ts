import { EventEmitter } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathsService } from '@src/main/paths'
import { cleanService } from '@src/main/lib/clean'
import { langService } from '@src/main/lib/lang'
import { selectionService } from '@src/main/selection'
import type { Lang, Settings, TtsStatus } from '@src/shared/types'

const ttsEvents = new EventEmitter()
ttsEvents.setMaxListeners(50)

let current: ChildProcess | null = null

const emit = (status: TtsStatus): void => {
  ttsEvents.emit('status', status)
}

export const ttsService = {
  events: ttsEvents,

  async speak(opts: { lang: Lang; text?: string; settings: Settings }): Promise<void> {
    await this.stop()

    let text = opts.text ?? ''
    if (!text) {
      text = await selectionService.grab()
    }
    if (!text) {
      emit({ state: 'idle' })
      return
    }

    let cleaned: string
    if (opts.settings.cleanText) {
      cleaned = cleanService.cleanText({ input: text, stripBrackets: opts.settings.stripBrackets })
    } else {
      cleaned = text.trim()
    }
    if (!cleaned) {
      emit({ state: 'idle' })
      return
    }

    const max = opts.settings.maxChars
    let capped = cleaned
    if (max > 0 && cleaned.length > max) {
      capped = `${cleaned.slice(0, max)} …`
    }

    const voice = langService.resolveVoice({
      lang: opts.lang,
      text: cleaned,
      settings: opts.settings
    })
    const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
    const json = path.join(pathsService.modelsDir(), `${voice}.onnx.json`)
    if (!fs.existsSync(onnx) || !fs.existsSync(json)) {
      emit({
        state: 'error',
        error: `Voice “${voice}” is not downloaded. Open Settings → Models.`
      })
      return
    }

    emit({ state: 'synthesizing', voice })

    const wavPath = path.join(os.tmpdir(), `tts-reader-${process.pid}-${Date.now()}.wav`)
    const args = [
      '-m',
      onnx,
      '-c',
      json,
      '-f',
      wavPath,
      '--length-scale',
      String(opts.settings.rate)
    ]

    let stderr = ''
    await new Promise<void>((resolve) => {
      let child: ChildProcess
      try {
        child = spawn(pathsService.piperBin(), args, { stdio: ['pipe', 'ignore', 'pipe'] })
      } catch (err) {
        stderr = String(err)
        resolve()
        return
      }
      current = child
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString()
      })
      child.on('error', (err) => {
        stderr += String(err)
        resolve()
      })
      child.on('exit', () => {
        resolve()
      })
      child.stdin?.end(capped)
    })

    current = null

    if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 0) {
      emit({ state: 'reading', voice })
      ttsEvents.emit('playWav', wavPath)
    } else {
      emit({ state: 'error', error: (stderr || 'Piper produced no audio.').trim() })
    }
  },

  async stop(): Promise<void> {
    if (current) {
      try {
        current.kill('SIGTERM')
      } catch {}
      current = null
    }
    ttsEvents.emit('stopPlayback')
    emit({ state: 'idle' })
  },

  playbackEnded(): void {
    emit({ state: 'idle' })
  },

  isReading(): boolean {
    return current !== null
  }
}
