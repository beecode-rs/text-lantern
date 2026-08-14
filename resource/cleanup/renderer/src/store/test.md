# test

- **Path:** `src/renderer/src/store/test.ts`
- **Layer:** Store
- **Process:** renderer
- **Lines:** 25

## What this file is for
Session-only Zustand store backing the settings "Test" tab. It holds `selectedLang` and `text` (seeded with a default sample sentence) plus their setters, so the chosen language and text survive tab switches — which unmount the component — without being persisted to disk. Quitting the app drops the renderer process and this state with it.

## Layer & placement assessment
- **Right layer?** Yes — a Zustand state store under `store/`, exactly where the architecture places renderer state.
- **Right process boundary?** Yes — renderer-only; the sole import is `zustand`. No Electron, `window`, IPC, or React.
- **Dependency direction ok?** Yes — imports nothing from the project (only `zustand`) and is consumed solely by `components/settings/Test.tsx`, which is the allowed `components` → `store` direction.
- **Folder naming (singular rule):** OK — `store` is singular.
- **File naming:** OK — plain `kebab-case`, matching its siblings `history.ts`, `models.ts`, `settings.ts`; stores carry no `-service` suffix convention.

## Notes / concerns
- Minor: the 5-line JSDoc block above `useTestStore` violates the project's "no comments" rule (writing-clean-ts). The intent is already implied by the store's name and the consumer (`Test.tsx`); it could be dropped.
- Minor: `test` is a generic stem, but it mirrors the `Test.tsx` settings tab it backs, so it stays consistent within the feature set.
