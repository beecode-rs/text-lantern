import { LifeCycle } from '@beecode/msh-app-boot'
import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { traySingleton } from '@src/main/lib/tray'
import type { TtsStatus } from '@src/shared/types'

export class TtsLifeCycle extends LifeCycle {
  protected _reflectReadingState: ((status: TtsStatus) => void) | null = null

  constructor() {
    super({ name: 'TTS service' })
  }

  protected async _createFn(): Promise<void> {
    this._reflectReadingState = (status: TtsStatus): void => {
      traySingleton().setReading(status.state === 'synthesizing' || status.state === 'reading')
    }
    ttsServiceSingleton().events.on('status', this._reflectReadingState)
    await this._prewarmVoice()
  }

  protected _destroyFn(): Promise<void> {
    if (this._reflectReadingState) {
      ttsServiceSingleton().events.off('status', this._reflectReadingState)
      this._reflectReadingState = null
    }
    ttsServiceSingleton().dispose()

    return Promise.resolve()
  }

  protected async _prewarmVoice(): Promise<void> {
    const voice = settingsDalSingleton().get().languageBindings[0]?.voice
    if (!voice) {
      return
    }
    await ttsServiceSingleton().prewarmVoice({ voice })
  }
}
