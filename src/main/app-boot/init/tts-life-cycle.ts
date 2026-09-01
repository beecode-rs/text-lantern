import { LifeCycle } from '@beecode/msh-app-boot'

import { ttsServiceSingleton } from '#src/main/business/service/tts-service'
import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { traySingleton } from '#src/main/lib/tray'
import { logger } from '#src/main/util/logger'
import { type TtsProvider, TtsState, type TtsStatus } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export class TtsLifeCycle extends LifeCycle {
  protected _reflectReadingState: ((status: TtsStatus) => void) | null = null

  constructor() {
    super({ name: 'TTS service' })
  }

  protected _createFn(): Promise<void> {
    this._reflectReadingState = (status: TtsStatus): void => {
      traySingleton().setReading(
        status.state === TtsState.LISTENING ||
          status.state === TtsState.SYNTHESIZING ||
          status.state === TtsState.READING,
      )
    }
    ttsServiceSingleton().events.on('status', this._reflectReadingState)
    void this._prewarmBoundProviders().catch((error: unknown) => {
      logger().warn('tts prewarm failed:', error)
    })

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    if (this._reflectReadingState) {
      ttsServiceSingleton().events.off('status', this._reflectReadingState)
      this._reflectReadingState = null
    }
    ttsServiceSingleton().dispose()

    return Promise.resolve()
  }

  protected _firstVoicePerProvider(): string[] {
    const voiceByProvider = new Map<TtsProvider, string>()
    settingsDalSingleton()
      .get()
      .languageBindings.forEach((binding) => {
        const { provider } = voiceIdParser.parse({ id: binding.voice })
        if (!voiceByProvider.has(provider)) {
          voiceByProvider.set(provider, binding.voice)
        }
      })

    return Array.from(voiceByProvider.values())
  }

  protected async _prewarmBoundProviders(): Promise<void> {
    const prewarms = this._firstVoicePerProvider().map((voice) => {
      return ttsServiceSingleton().prewarmVoice({ voice })
    })
    await Promise.all(prewarms)
  }
}
