import { create } from 'zustand'

import { TtsProvider } from '#src/shared/types'

export enum GeneralTab {
  BACKUP = 'BACKUP',
  SPEECH = 'SPEECH',
  WINDOW = 'WINDOW',
}

export enum ModelsProvider {
  ALL = 'ALL',
}

export enum ModelsTab {
  MANUAL = 'MANUAL',
  PREDEFINED = 'PREDEFINED',
  SEARCH = 'SEARCH',
}

interface PageTabsStore {
  generalTab: GeneralTab
  modelsProvider: TtsProvider | ModelsProvider
  modelsTab: ModelsTab
  setGeneralTab: (generalTab: GeneralTab) => void
  setModelsProvider: (modelsProvider: TtsProvider | ModelsProvider) => void
  setModelsTab: (modelsTab: ModelsTab) => void
}

export const usePageTabsStore = create<PageTabsStore>((set) => ({
  generalTab: GeneralTab.WINDOW,
  modelsProvider: ModelsProvider.ALL,
  modelsTab: ModelsTab.SEARCH,
  setGeneralTab: (generalTab) => {
    set({ generalTab })
  },
  setModelsProvider: (modelsProvider) => {
    set({ modelsProvider })
  },
  setModelsTab: (modelsTab) => {
    set({ modelsTab })
  },
}))
