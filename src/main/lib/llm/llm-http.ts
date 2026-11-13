import { constant } from '#src/main/util/constants'

interface LlmHttpRequest {
  headers?: Headers
  serviceLabel: string
  timeoutMs: number
  unreachableMessage: string
  url: string
}

interface LlmHttpPostRequest extends LlmHttpRequest {
  body: unknown
}

interface LlmHttpSendRequest extends LlmHttpRequest {
  body?: string
  method: 'GET' | 'POST'
}

export class LlmHttp {
  getJson<ResponseType>(params: LlmHttpRequest): Promise<ResponseType> {
    const { headers, serviceLabel, timeoutMs, unreachableMessage, url } = params

    return this._requestJson<ResponseType>({
      headers,
      method: 'GET',
      serviceLabel,
      timeoutMs,
      unreachableMessage,
      url,
    })
  }

  postJson<ResponseType>(params: LlmHttpPostRequest): Promise<ResponseType> {
    const { body, headers, serviceLabel, timeoutMs, unreachableMessage, url } = params

    return this._requestJson<ResponseType>({
      body: JSON.stringify(body),
      headers: this._jsonHeaders({ headers }),
      method: 'POST',
      serviceLabel,
      timeoutMs,
      unreachableMessage,
      url,
    })
  }

  protected _jsonHeaders(params: { headers?: Headers }): Headers {
    const headers = new Headers(params.headers)

    headers.append('content-type', 'application/json')

    return headers
  }

  protected async _requestJson<ResponseType>(params: LlmHttpSendRequest): Promise<ResponseType> {
    const { serviceLabel } = params
    const response = await this._fetchResponse(params)

    if (!response.ok) {
      throw new Error(await this._responseErrorMessage({ response, serviceLabel }))
    }

    try {
      return (await response.json()) as ResponseType
    } catch {
      throw new Error(`${serviceLabel} returned an invalid response.`)
    }
  }

  protected async _fetchResponse(params: LlmHttpSendRequest): Promise<Response> {
    const { body, headers, method, timeoutMs, url } = params

    try {
      return await fetch(url, {
        body,
        headers,
        method,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      throw new Error(this._networkErrorMessage({ error, request: params }))
    }
  }

  protected _networkErrorMessage(params: { error: unknown; request: LlmHttpSendRequest }): string {
    const { error, request } = params

    if (this._isTimeoutError({ error })) {
      const timeoutSeconds = Math.round(request.timeoutMs / 1000)

      return `${request.serviceLabel} did not respond within ${String(timeoutSeconds)} seconds.`
    }

    return request.unreachableMessage
  }

  protected _isTimeoutError(params: { error: unknown }): boolean {
    return params.error instanceof Error && params.error.name === 'TimeoutError'
  }

  protected async _responseErrorMessage(params: { response: Response; serviceLabel: string }): Promise<string> {
    const { response, serviceLabel } = params
    const bodyExcerpt = (await response.text()).slice(0, constant().llm.bodyExcerptChars).trim()

    return `${serviceLabel} request failed with status ${String(response.status)}: ${bodyExcerpt}`
  }
}
