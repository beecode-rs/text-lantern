import { LlmHttp } from '#src/main/lib/llm/llm-http'
import type { LlmProviderAdapter } from '#src/main/lib/llm/llm-provider'
import { constant } from '#src/main/util/constants'
import { OLLAMA_DEFAULT_BASE_URL } from '#src/shared/grammar/llm-defaults'
import { type LlmModel, LlmProvider } from '#src/shared/types'

export { OLLAMA_DEFAULT_BASE_URL }

interface OllamaTagsResponse {
  models: { name: string }[]
}

interface OllamaChatResponse {
  done_reason?: string
  message: { content: string }
}

export class OllamaProvider implements LlmProviderAdapter {
  readonly provider: LlmProvider = LlmProvider.OLLAMA

  protected readonly _baseUrl: string

  protected readonly _http = new LlmHttp()

  constructor(params: { baseUrl: string }) {
    const { baseUrl } = params
    this._baseUrl = baseUrl
  }

  async listModels(): Promise<LlmModel[]> {
    const response = await this._http.getJson<OllamaTagsResponse>({
      serviceLabel: this._serviceLabel(),
      timeoutMs: constant().llm.listTimeoutMs,
      unreachableMessage: this._unreachableMessage(),
      url: `${this._resolveBaseUrl()}/api/tags`,
    })

    return response.models.map((model) => {
      return { id: model.name, name: model.name }
    })
  }

  async complete(params: { model: string; system: string; user: string }): Promise<string> {
    const { model, system, user } = params

    const response = await this._http.postJson<OllamaChatResponse>({
      body: {
        messages: [
          { content: system, role: 'system' },
          { content: user, role: 'user' },
        ],
        model,
        // Ollama silently caps output at its default num_predict (128 tokens), which truncates
        // long JSON responses mid-string. -1 removes the cap; the grammar service caps the
        // input length and the HTTP timeout bounds runaway generation.
        options: { ['num_predict']: -1 },
        stream: false,
      },
      serviceLabel: this._serviceLabel(),
      timeoutMs: constant().llm.completeTimeoutMs,
      unreachableMessage: this._unreachableMessage(),
      url: `${this._resolveBaseUrl()}/api/chat`,
    })
    if (response.done_reason === 'length') {
      throw new Error('The model response was cut short (token limit). Try checking a shorter selection.')
    }

    return response.message.content
  }

  protected _resolveBaseUrl(): string {
    if (this._baseUrl !== '') {
      return this._baseUrl
    }

    return OLLAMA_DEFAULT_BASE_URL
  }

  protected _serviceLabel(): string {
    return `Ollama at ${this._resolveBaseUrl()}`
  }

  protected _unreachableMessage(): string {
    return `Could not reach ${this._serviceLabel()}. Is the local server running?`
  }
}
