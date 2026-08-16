import { create } from 'zustand'

const DEFAULT_TEXT =
  'The quick brown fox jumps over the lazy dog. This is a sample of English text, spoken by the selected voice.'

interface TestStore {
  selectedLang: string
  text: string
  setLang: (lang: string) => void
  setText: (text: string) => void
}

export const useTestStore = create<TestStore>((set) => ({
  selectedLang: 'auto',
  text: DEFAULT_TEXT,
  setLang: (selectedLang) => {
    set({ selectedLang })
  },
  setText: (text) => {
    set({ text })
  }
}))
