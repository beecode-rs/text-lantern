import type { TtsApi } from '../../shared/types'

export const api: TtsApi = (window as unknown as { api: TtsApi }).api
