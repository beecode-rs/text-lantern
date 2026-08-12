import { create } from 'zustand'

const DEFAULT_TEXT =
  'The quick brown fox jumps over the lazy dog. This is a sample of English text, spoken by the selected voice.'

interface TestStore {
  selectedLang: string
  text: string
  setLang: (lang: string) => void
  setText: (text: string) => void
}

/**
 * Session-only state for the Test tab. Kept in a store rather than component
 * state so switching tabs (which unmounts the component) does not discard the
 * chosen language and text. Intentionally not persisted: quitting the app drops
 * the renderer process and this state along with it.
 */
export const useTestStore = create<TestStore>((set) => ({
  selectedLang: 'auto',
  text: DEFAULT_TEXT,
  setLang: (selectedLang) => set({ selectedLang }),
  setText: (text) => set({ text })
}))
