import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { cosyvoiceSentenceSplitter } from '#src/main/lib/cosyvoice/_sentence-splitter'
import { cosyvoiceEngineSingleton } from '#src/main/lib/cosyvoice/engine'
import { cosyvoiceServerSingleton } from '#src/main/lib/cosyvoice/server'
import type { TtsProviderAdapter } from '#src/main/lib/tts/tts-provider'
import { constant } from '#src/main/util/constants'
import { experimentalUtil } from '#src/shared/experimental/experimental-util'
import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

interface CosyvoiceSynthesisRun {
  isCancelled: boolean
}

export class CosyvoiceProvider implements TtsProviderAdapter {
  readonly provider: TtsProvider = TtsProvider.COSYVOICE

  protected readonly _firstSegmentChars = 60

  protected readonly _maxSentenceChars = 120

  protected readonly _sampleRateHz = constant().cosyvoiceServer.defaultSampleRateHz

  protected _activeSynthesisRun: CosyvoiceSynthesisRun | null = null

  hasVoiceModelFiles(params: { voice: string }): boolean {
    if (!this._isCosyvoiceActive()) {
      return false
    }
    const engine = cosyvoiceEngineSingleton()
    if (!engine.isSupported() || !engine.isEngineInstalled()) {
      return false
    }
    if (engine.installedModelFileName() === null) {
      return false
    }

    return engine.hasVoicePrompt({ voiceName: this._voiceName({ voice: params.voice }) })
  }

  async ensureReadyForVoice(params: { voice: string }): Promise<{ sampleRate: number }> {
    if (!this._isCosyvoiceActive()) {
      throw new Error('CosyVoice is turned off. Enable Experimental features in Settings → General.')
    }
    const engine = cosyvoiceEngineSingleton()
    const modelFileName = engine.installedModelFileName()
    if (modelFileName === null) {
      throw new Error('CosyVoice model is not downloaded. Open Settings → Models.')
    }
    const voiceName = this._voiceName({ voice: params.voice })
    if (!engine.hasVoicePrompt({ voiceName })) {
      throw new Error(`CosyVoice voice "${params.voice}" is missing. Open Settings → Models.`)
    }
    await cosyvoiceServerSingleton().ensureReady({
      modelFileName,
      voiceNames: engine.installedVoiceNames(),
    })

    return { sampleRate: this._sampleRateHz }
  }

  async synthesize(params: {
    text: string
    voice: string
    speed: number
    onChunk: (chunk: Buffer) => void
  }): Promise<void> {
    const run: CosyvoiceSynthesisRun = { isCancelled: false }
    this._activeSynthesisRun = run
    try {
      await this._synthesizeSentences({
        onChunk: params.onChunk,
        run,
        speed: params.speed,
        text: params.text,
        voice: params.voice,
      })
    } finally {
      if (this._activeSynthesisRun === run) {
        this._activeSynthesisRun = null
      }
    }
  }

  async cancelActive(): Promise<void> {
    const run = this._activeSynthesisRun
    if (run) {
      run.isCancelled = true
    }
    await cosyvoiceServerSingleton().cancelActive()
  }

  dispose(): void {
    const run = this._activeSynthesisRun
    if (run) {
      run.isCancelled = true
    }
    cosyvoiceServerSingleton().dispose()
  }

  protected _voiceName(params: { voice: string }): string {
    return voiceIdParser.parse({ id: params.voice }).name
  }

  protected _isCosyvoiceActive(): boolean {
    return experimentalUtil.isCosyvoiceActive({ settings: settingsDalSingleton().get() })
  }

  protected async _synthesizeSentences(params: {
    onChunk: (chunk: Buffer) => void
    run: CosyvoiceSynthesisRun
    speed: number
    text: string
    voice: string
  }): Promise<void> {
    const voiceName = this._voiceName({ voice: params.voice })
    const sentences = cosyvoiceSentenceSplitter.split({
      firstMaxChars: this._firstSegmentChars,
      maxChars: this._maxSentenceChars,
      text: params.text,
    })
    await sentences.reduce(async (acc, sentence) => {
      await acc
      if (params.run.isCancelled) {
        throw this._stoppedError()
      }
      await this._synthesizeSentence({
        onChunk: params.onChunk,
        speed: params.speed,
        text: sentence,
        voiceName,
      })
    }, Promise.resolve())
  }

  protected async _synthesizeSentence(params: {
    onChunk: (chunk: Buffer) => void
    speed: number
    text: string
    voiceName: string
  }): Promise<void> {
    const pcmParts: Buffer[] = []
    try {
      await cosyvoiceServerSingleton().synthesize({
        onChunk: (chunk) => {
          pcmParts.push(chunk)
        },
        speed: params.speed,
        text: params.text,
        voiceName: params.voiceName,
      })
    } catch (error) {
      throw this._friendlySynthesizeError({ error })
    }
    const pcm = Buffer.concat(pcmParts)
    if (pcm.length > 0) {
      params.onChunk(pcm)
    }
  }

  protected _stoppedError(): Error {
    const error = new Error('CosyVoice was stopped')
    error.name = 'AbortError'

    return error
  }

  protected _friendlySynthesizeError(params: { error: unknown }): Error {
    if (this._isAbortError(params.error)) {
      return new Error('CosyVoice was stopped')
    }
    if (params.error instanceof Error) {
      return params.error
    }

    return new Error(String(params.error))
  }

  protected _isAbortError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false
    }

    return (error as { name?: unknown }).name === 'AbortError'
  }
}

export const cosyvoiceProviderSingleton = singletonPattern(() => new CosyvoiceProvider())
