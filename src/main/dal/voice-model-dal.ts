import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { langUtil } from '@src/main/util/lang-util'
import { pathUtil } from '@src/main/util/path-util'
import type { Voice } from '@src/shared/types'
import fs from 'node:fs'
import path from 'node:path'

export class VoiceModelDal {
  listVoices(): Voice[] {
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
            return binding.voice === name
          }),
          lang: langUtil.voiceLang({ name }),
          name,
          sizeBytes: this._fileSizeBytes({ file: path.join(dir, `${name}.onnx`) }),
        }
      })
  }

  deleteVoice(params: { name: string }): void {
    const dir = pathUtil.modelsDir()
    ;['onnx', 'onnx.json'].forEach((ext) => {
      this._removeIgnoringFailure({ file: path.join(dir, `${params.name}.${ext}`) })
    })
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
