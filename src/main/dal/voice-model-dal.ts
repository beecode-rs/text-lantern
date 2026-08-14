import fs from 'node:fs'
import path from 'node:path'

import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { langService } from '@src/main/util/lang-service'
import { pathsService } from '@src/main/util/paths-service'
import type { Voice } from '@src/shared/types'

export class VoiceModelDal {
  public listVoices(): Voice[] {
    const dir = pathsService.modelsDir()
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
        })
    )

    return Array.from(onnxNames)
      .sort()
      .map<Voice>((name) => {
        let sizeBytes = 0
        try {
          sizeBytes = fs.statSync(path.join(dir, `${name}.onnx`)).size
        } catch {}
        return {
          name,
          hasJson: fs.existsSync(path.join(dir, `${name}.onnx.json`)),
          sizeBytes,
          lang: langService.voiceLang({ name }),
          inUse: settings.languageBindings.some((binding) => {
            return binding.voice === name
          })
        }
      })
  }

  public deleteVoice(params: { name: string }): void {
    const dir = pathsService.modelsDir()
    ;['onnx', 'onnx.json'].forEach((ext) => {
      const file = path.join(dir, `${params.name}.${ext}`)
      try {
        fs.rmSync(file, { force: true })
      } catch {}
    })
  }
}

export const voiceModelDalSingleton = singletonPattern(() => {
  return new VoiceModelDal()
})
