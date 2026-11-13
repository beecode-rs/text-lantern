import { LlmHttp } from '#src/main/lib/llm/llm-http'
import type { LlmProviderAdapter } from '#src/main/lib/llm/llm-provider'
import { constant } from '#src/main/util/constants'
import { ANTHROPIC_DEFAULT_BASE_URL } from '#src/shared/grammar/llm-defaults'
import { type LlmModel, LlmProvider } from '#src/shared/types'

export { ANTHROPIC_DEFAULT_BASE_URL }

interface AnthropicModelsResponse {
  data: { display_name?: string; id: string }[]
}

interface AnthropicMessagesResponse {
  content: { text?: string; type: string }[]
  stop_reason?: string
}

export class AnthropicProvider implements LlmProviderAdapter {
  readonly provider: LlmProvider = LlmProvider.ANTHROPIC

  protected readonly _apiKey: string

  protected readonly _baseUrl: string

  protected readonly _http = new LlmHttp()

  constructor(params: { apiKey: string; baseUrl: string }) {
    const { apiKey, baseUrl } = params
    this._apiKey = apiKey
    this._baseUrl = baseUrl
  }

  async listModels(): Promise<LlmModel[]> {
    this._assertApiKeyIsSet()

    const response = await this._http.getJson<AnthropicModelsResponse>({
      headers: this._requestHeaders(),
      serviceLabel: this._serviceLabel(),
      timeoutMs: constant().llm.listTimeoutMs,
      unreachableMessage: this._unreachableMessage(),
      url: `${this._resolveBaseUrl()}/v1/models`,
    })

    return response.data.map((model) => {
      return { id: model.id, name: model.display_name ?? model.id }
    })
  }

  async complete(params: { model: string; system: string; user: string }): Promise<string> {
    const { model, system, user } = params
    this._assertApiKeyIsSet()

    const response = await this._http.postJson<AnthropicMessagesResponse>({
      body: {
        ['max_tokens']: 8192,
        messages: [{ content: user, role: 'user' }],
        model,
        system,
      },
      headers: this._requestHeaders(),
      serviceLabel: this._serviceLabel(),
      timeoutMs: constant().llm.completeTimeoutMs,
      unreachableMessage: this._unreachableMessage(),
      url: `${this._resolveBaseUrl()}/v1/messages`,
    })
    if (response.stop_reason === 'max_tokens') {
      throw new Error('The model response was cut short (token limit). Try checking a shorter selection.')
    }

    return response.content
      .filter((contentBlock) => {
        return contentBlock.type === 'text'
      })
      .map((contentBlock) => {
        return contentBlock.text ?? ''
      })
      .join('')
  }

  protected _assertApiKeyIsSet(): void {
    if (this._apiKey === '') {
      throw new Error('Missing Anthropic API key. Open Settings → General → Grammar and set the API key.')
    }
  }

  protected _requestHeaders(): Headers {
    const headers = new Headers()

    headers.append('x-api-key', this._apiKey)
    headers.append('anthropic-version', '2023-06-01')

    return headers
  }

  protected _resolveBaseUrl(): string {
    if (this._baseUrl !== '') {
      return this._baseUrl
    }

    return ANTHROPIC_DEFAULT_BASE_URL
  }

  protected _serviceLabel(): string {
    return `The Anthropic API at ${this._resolveBaseUrl()}`
  }

  protected _unreachableMessage(): string {
    return `Could not reach ${this._serviceLabel()}.`
  }
}
