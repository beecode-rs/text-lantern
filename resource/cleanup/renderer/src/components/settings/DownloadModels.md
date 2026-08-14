# DownloadModels

- **Path:** `src/renderer/src/components/settings/DownloadModels.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 166

## What this file is for
The "Download voices" settings screen: lets the user search the Piper voice catalog by language code or name, see remote matches with install state, trigger downloads, and add a voice by exact name (e.g. `sr_Marko_medium`). It also surfaces in-progress downloads. All state comes from the `models` Zustand store; this file owns only the search/download interaction and rendering.

## Layer & placement assessment
- **Right layer?** Yes — a settings tab screen, correctly placed under `components/settings/` exactly as the architecture defines.
- **Right process boundary?** Yes — pure renderer. Only React, `lucide-react` icons, the `store/models` hook, and `components/ui/*` primitives. No Electron, `window.api`, or IPC references.
- **Dependency direction ok?** Yes — imports flow downward (component → store, component → UI primitive). Nothing here is imported by `store` or `lib`.
- **Folder naming (singular rule):** VIOLATION — lives under the plural `components/settings/` path; the project rule requires singular folders (e.g. `component/setting/`).
- **File naming:** NOTE — PascalCase `DownloadModels.tsx`; the writing-clean-ts convention for UI components is `kebab-case.tsx` (e.g. `download-models.tsx`). The `.tsx` extension is correct since the file exports JSX.

## Notes / concerns
- Imported only by `components/settings/Models.tsx` (its parent settings screen), so scope is correct and self-contained.
- Both `search` and `download` store calls are fire-and-forget via `void`; `searchError` is surfaced but download failures are not — worth a follow-up if downloads can fail silently.
