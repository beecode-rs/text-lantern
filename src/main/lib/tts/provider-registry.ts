import { singletonPattern } from '@beecode/msh-util/singleton/pattern'

import { kokoroProviderSingleton } from '#src/main/lib/kokoro/kokoro-provider'
import { piperProviderSingleton } from '#src/main/lib/piper/piper-provider'
import type { TtsProviderAdapter } from '#src/main/lib/tts/tts-provider'
import { TtsProvider } from '#src/shared/types'

export class TtsProviderRegistry {
  protected readonly _providers = new Map<TtsProvider, TtsProviderAdapter>([
    [TtsProvider.KOKORO, kokoroProviderSingleton()],
    [TtsProvider.PIPER, piperProviderSingleton()],
  ])

  providerFor(params: { provider: TtsProvider }): TtsProviderAdapter {
    const provider = this._providers.get(params.provider)
    if (!provider) {
      throw new Error(`No TTS provider registered for "${params.provider}".`)
    }

    return provider
  }

  disposeAll(): void {
    Array.from(this._providers.values()).forEach((provider) => {
      provider.dispose()
    })
  }
}

export const ttsProviderRegistrySingleton = singletonPattern(() => new TtsProviderRegistry())
