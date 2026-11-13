import type { LlmModel, LlmProvider } from '#src/shared/types'

export interface LlmProviderAdapter {
  readonly provider: LlmProvider
  listModels(): Promise<LlmModel[]>
  complete(params: { model: string; system: string; user: string }): Promise<string>
}
