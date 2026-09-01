import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import type { KokoroTTS, TextSplitterStream } from 'kokoro-js'

import { kokoroEngineSingleton } from '#src/main/lib/kokoro/engine'
import type { TtsProviderAdapter } from '#src/main/lib/tts/tts-provider'
import { pathUtil } from '#src/main/util/path-util'
import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

type KokoroModule = { KokoroTTS: typeof KokoroTTS; TextSplitterStream: typeof TextSplitterStream }
type KokoroStream = ReturnType<KokoroTTS['stream']>
type KokoroVoiceKey = keyof KokoroTTS['voices']

export class KokoroProvider implements TtsProviderAdapter {
  readonly provider: TtsProvider = TtsProvider.KOKORO

  protected _activeWorkPromise: Promise<void> | null = null
  protected _generation = 0
  protected _modulePromise: Promise<KokoroModule> | null = null
  protected _ttsPromise: Promise<KokoroTTS> | null = null
  protected readonly _sampleRateHz = 24000

  hasVoiceModelFiles(params: { voice: string }): boolean {
    const engine = kokoroEngineSingleton()

    return engine.isModelDownloaded() && engine.isVoiceDownloaded({ voiceId: this._voiceId({ voice: params.voice }) })
  }

  async ensureReadyForVoice(params: { voice: string }): Promise<{ sampleRate: number }> {
    this._requireDownloaded({ voice: params.voice })
    await this._loadedTts()

    return { sampleRate: this._sampleRateHz }
  }

  async synthesize(params: {
    text: string
    voice: string
    speed: number
    onChunk: (chunk: Buffer) => void
  }): Promise<void> {
    const voiceId = this._voiceId({ voice: params.voice })
    const kokoro = await this._loadedModule()
    const tts = await this._loadedTts()
    const generation = this._generation
    const splitter = new kokoro.TextSplitterStream()
    splitter.push(params.text)
    splitter.close()
    const stream = tts.stream(splitter, { speed: params.speed, voice: voiceId as KokoroVoiceKey })
    const work = this._pumpChunks({ generation, onChunk: params.onChunk, stream })
    this._trackActiveWork(work)

    try {
      await work
    } catch (error) {
      if (this._generation === generation) {
        throw error
      }
    }
  }

  cancelActive(): Promise<void> {
    this._generation += 1

    return Promise.resolve()
  }

  dispose(): void {
    this._generation += 1
    const workSettled = this._activeWorkPromise ?? Promise.resolve()
    const ttsPromise = this._ttsPromise
    this._ttsPromise = null
    void ttsPromise
      ?.then((tts) => {
        return workSettled.then(() => {
          return tts.model.dispose()
        })
      })
      .catch(() => {
        return undefined
      })
  }

  protected _loadedModule(): Promise<KokoroModule> {
    this._modulePromise ??= import('kokoro-js')

    return this._modulePromise
  }

  protected _loadedTts(): Promise<KokoroTTS> {
    this._ttsPromise ??= this._loadTts().catch((error: unknown) => {
      this._ttsPromise = null

      throw error
    })

    return this._ttsPromise
  }

  protected async _loadTts(): Promise<KokoroTTS> {
    const kokoro = await this._loadedModule()

    return kokoro.KokoroTTS.from_pretrained(pathUtil.kokoroModelDir(), { device: 'cpu', dtype: 'q8' })
  }

  protected _trackActiveWork(work: Promise<unknown>): void {
    const previous = this._activeWorkPromise ?? Promise.resolve()
    this._activeWorkPromise = previous
      .then(() => {
        return work
      })
      .then(
        () => {
          return undefined
        },
        () => {
          return undefined
        },
      )
  }

  protected async _pumpChunks(params: {
    generation: number
    onChunk: (chunk: Buffer) => void
    stream: KokoroStream
  }): Promise<void> {
    if (this._generation !== params.generation) {
      return Promise.resolve()
    }
    const chunk = await params.stream.next()
    if (this._generation !== params.generation) {
      return Promise.resolve()
    }
    if (chunk.done) {
      return Promise.resolve()
    }
    params.onChunk(this._pcmBufferFromSamples(chunk.value.audio.audio))

    return this._pumpChunks(params)
  }

  protected _pcmBufferFromSamples(samples: Float32Array): Buffer {
    const pcm = new Int16Array(samples.length)
    samples.forEach((sample, index) => {
      const clamped = Math.max(-1, Math.min(1, sample))

      pcm[index] = Math.round(clamped * 32767)
    })

    return Buffer.from(pcm.buffer)
  }

  protected _requireDownloaded(params: { voice: string }): void {
    const engine = kokoroEngineSingleton()
    if (!engine.isModelDownloaded()) {
      throw new Error('Kokoro model is not downloaded. Open Settings → Models.')
    }
    if (!engine.isVoiceDownloaded({ voiceId: this._voiceId({ voice: params.voice }) })) {
      throw new Error(`Kokoro voice "${params.voice}" is not downloaded. Open Settings → Models.`)
    }
  }

  protected _voiceId(params: { voice: string }): string {
    return voiceIdParser.parse({ id: params.voice }).name
  }
}

export const kokoroProviderSingleton = singletonPattern(() => new KokoroProvider())
