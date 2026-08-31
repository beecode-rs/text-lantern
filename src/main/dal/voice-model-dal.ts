import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'
import path from 'node:path'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { kokoroEngineSingleton } from '#src/main/lib/kokoro/engine'
import { constant } from '#src/main/util/constants'
import { langUtil } from '#src/main/util/lang-util'
import { pathUtil } from '#src/main/util/path-util'
import { type Settings, TtsProvider, type Voice } from '#src/shared/types'
import { KOKORO_VOICE_CATALOG } from '#src/shared/voice/kokoro-voice-catalog'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export class VoiceModelDal {
  listVoices(): Voice[] {
    return [...this._listPiperVoices(), ...this._listKokoroVoices()]
  }

  deleteVoice(params: { name: string }): void {
    const dir = pathUtil.modelsDir()
    ;['onnx', 'onnx.json'].forEach((ext) => {
      this._removeIgnoringFailure({ file: path.join(dir, `${params.name}.${ext}`) })
    })
  }

  protected _listPiperVoices(): Voice[] {
    const dir = pathUtil.modelsDir()
    const settings = settingsDalSingleton().get()
    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return []
    }

    const onnxNames = new Set(
      entries
        .filter((e) => {
          return e.endsWith('.onnx')
        })
        .map((e) => {
          return e.slice(0, -'.onnx'.length)
        }),
    )

    return Array.from(onnxNames)
      .sort()
      .map<Voice>((name) => {
        return {
          hasJson: fs.existsSync(path.join(dir, `${name}.onnx.json`)),
          isInUse: settings.languageBindings.some((binding) => {
            const voiceId = voiceIdParser.parse({ id: binding.voice })

            return voiceId.provider === TtsProvider.PIPER && voiceId.name === name
          }),
          lang: langUtil.voiceLang({ name }),
          name,
          provider: TtsProvider.PIPER,
          sizeBytes: this._fileSizeBytes({ file: path.join(dir, `${name}.onnx`) }),
        }
      })
  }

  protected _listKokoroVoices(): Voice[] {
    const dir = pathUtil.kokoroVoicesDir()
    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return []
    }
    const suffix = constant().kokoroEngine.markerFileSuffix
    const voiceIds = entries
      .filter((e) => {
        return e.endsWith(suffix)
      })
      .map((e) => {
        return e.slice(0, -suffix.length)
      })
      .sort()
    if (voiceIds.length === 0) {
      return []
    }
    const settings = settingsDalSingleton().get()
    const sizeBytes = this._kokoroModelSizeBytes()

    return voiceIds
      .map((voiceId) => {
        return this._kokoroMarkerToVoice({ settings, sizeBytes, voiceId })
      })
      .filter((voice): voice is Voice => {
        return voice !== null
      })
  }

  protected _kokoroMarkerToVoice(params: { settings: Settings; sizeBytes: number; voiceId: string }): Voice | null {
    const catalogVoice = KOKORO_VOICE_CATALOG.find((voice) => {
      return voice.id === params.voiceId
    })
    if (catalogVoice === undefined) {
      return null
    }

    return {
      hasJson: true,
      isInUse: params.settings.languageBindings.some((binding) => {
        const parsed = voiceIdParser.parse({ id: binding.voice })

        return parsed.provider === TtsProvider.KOKORO && parsed.name === params.voiceId
      }),
      lang: catalogVoice.lang,
      name: params.voiceId,
      provider: TtsProvider.KOKORO,
      sizeBytes: params.sizeBytes,
    }
  }

  protected _kokoroModelSizeBytes(): number {
    if (!kokoroEngineSingleton().isModelDownloaded()) {
      return 0
    }

    return constant().kokoroEngine.modelFiles.reduce((acc, file) => {
      return acc + this._fileSizeBytes({ file: path.join(pathUtil.kokoroModelDir(), file.path) })
    }, 0)
  }

  protected _fileSizeBytes(params: { file: string }): number {
    try {
      return fs.statSync(params.file).size
    } catch {
      return 0
    }
  }

  protected _removeIgnoringFailure(params: { file: string }): void {
    try {
      fs.rmSync(params.file, { force: true })
    } catch {
      return undefined
    }
  }
}

export const voiceModelDalSingleton = singletonPattern(() => {
  return new VoiceModelDal()
})
