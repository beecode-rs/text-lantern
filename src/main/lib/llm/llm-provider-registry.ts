import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { typeUtil } from '@beecode/msh-util/type-util'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { AnthropicProvider } from '#src/main/lib/llm/anthropic-provider'
import type { LlmProviderAdapter } from '#src/main/lib/llm/llm-provider'
import { OllamaProvider } from '#src/main/lib/llm/ollama-provider'
import { LlmProvider, type Settings } from '#src/shared/types'

export class LlmProviderRegistry {
  providerFor(params: { provider: LlmProvider }): LlmProviderAdapter {
    const { provider } = params

    return this._providerFromSettings({ provider, settings: settingsDalSingleton().get() })
  }

  protected _providerFromSettings(params: { provider: LlmProvider; settings: Settings }): LlmProviderAdapter {
    const { provider, settings } = params
    const baseUrl = this._normalizedBaseUrl({ provider, rawBaseUrl: settings.grammarLlmBaseUrl })

    switch (provider) {
      case LlmProvider.ANTHROPIC: {
        return new AnthropicProvider({ apiKey: settings.grammarLlmApiKey, baseUrl })
      }
      case LlmProvider.OLLAMA: {
        return new OllamaProvider({ baseUrl })
      }
      default: {
        throw typeUtil.exhaustiveError('LlmProviderRegistry.providerFor', provider)
      }
    }
  }

  protected _normalizedBaseUrl(params: { provider: LlmProvider; rawBaseUrl: string }): string {
    const normalized = params.rawBaseUrl.trim().replace(/\/+$/, '')
    if (params.provider === LlmProvider.ANTHROPIC && normalized.endsWith('/v1')) {
      return normalized.slice(0, -'/v1'.length)
    }

    return normalized
  }
}

export const llmProviderRegistrySingleton = singletonPattern(() => new LlmProviderRegistry())
