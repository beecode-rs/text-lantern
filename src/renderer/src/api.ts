import type { TtsApi } from '@src/shared/types'

export const api: TtsApi = (window as unknown as { api: TtsApi }).api
