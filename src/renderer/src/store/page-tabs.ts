import { create } from 'zustand'

export enum GeneralTab {
  BACKUP = 'BACKUP',
  SPEECH = 'SPEECH',
  WINDOW = 'WINDOW',
}

export enum ModelsTab {
  MANUAL = 'MANUAL',
  MODELS = 'MODELS',
  PREDEFINED = 'PREDEFINED',
  SEARCH = 'SEARCH',
}

interface PageTabsStore {
  generalTab: GeneralTab
  modelsTab: ModelsTab
  setGeneralTab: (generalTab: GeneralTab) => void
  setModelsTab: (modelsTab: ModelsTab) => void
}

export const usePageTabsStore = create<PageTabsStore>((set) => ({
  generalTab: GeneralTab.WINDOW,
  modelsTab: ModelsTab.MODELS,
  setGeneralTab: (generalTab) => {
    set({ generalTab })
  },
  setModelsTab: (modelsTab) => {
    set({ modelsTab })
  },
}))
