import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'
import path from 'node:path'

import { piperServerSingleton } from '#src/main/lib/piper/server'
import type { TtsProviderAdapter } from '#src/main/lib/tts/tts-provider'
import { pathUtil } from '#src/main/util/path-util'
import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export class PiperProvider implements TtsProviderAdapter {
  readonly provider: TtsProvider = TtsProvider.PIPER

  hasVoiceModelFiles(params: { voice: string }): boolean {
    const { onnx, json } = this._voiceModelPaths({ voice: params.voice })

    return fs.existsSync(onnx) && fs.existsSync(json)
  }

  ensureReadyForVoice(params: { voice: string }): Promise<{ sampleRate: number }> {
    return piperServerSingleton().ensureReady({ modelPath: this._voiceModelPaths({ voice: params.voice }).onnx })
  }

  synthesize(params: { text: string; voice: string; speed: number; onChunk: (chunk: Buffer) => void }): Promise<void> {
    return piperServerSingleton().synthesize(
      { lengthScale: this._lengthScaleFromSpeed(params.speed), text: params.text },
      { onChunk: params.onChunk },
    )
  }

  cancelActive(): Promise<void> {
    return piperServerSingleton().cancelActive()
  }

  dispose(): void {
    piperServerSingleton().dispose()
  }

  protected _voiceModelPaths(params: { voice: string }): { onnx: string; json: string } {
    const { name } = voiceIdParser.parse({ id: params.voice })
    const onnx = path.join(pathUtil.modelsDir(), `${name}.onnx`)
    const json = path.join(pathUtil.modelsDir(), `${name}.onnx.json`)

    return { json, onnx }
  }

  protected _lengthScaleFromSpeed(speed: number): number {
    if (speed > 0) {
      return 1 / speed
    }

    return 1
  }
}

export const piperProviderSingleton = singletonPattern(() => new PiperProvider())
