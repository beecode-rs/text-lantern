# models

- **Path:** `src/renderer/src/store/models.ts`
- **Layer:** Store
- **Process:** renderer
- **Lines:** 87

## What this file is for
A Zustand store that owns renderer state for TTS voice models: the installed `voices`, `engineInstalled`/`installing` flags, download `logs` and per-voice `progress`, plus remote `search` results and error. Its async actions (`load`, `refreshEngine`, `download`, `remove`, `installEngine`, `search`) delegate to the typed `api` IPC bridge to main and reflect results into state, while `appendLog`/`setProgress` let the UI push incremental updates during a download/install. No JSX, no business rules beyond coordinating IPC calls with local state.

## Layer & placement assessment
- **Right layer?** Yes — Zustand stores live in `store/`; this file only holds renderer state and IPC delegation, nothing that belongs elsewhere.
- **Right process boundary?** Yes — imports are `@src/shared/types` (shared, allowed for all) and `@src/renderer/src/api` (the renderer IPC bridge). No direct React, Electron, or `ipcRenderer` import; the heavy Piper/download logic stays on main and is reached via `api`.
- **Dependency direction ok?** Yes — `store` → `api` → `shared`. Importers are `App.tsx` and `components/settings/*`, the correct direction (components use store; store does not import components). No upward or circular import.
- **Folder naming (singular rule):** OK — `store` is singular.
- **File naming:** OK — `models.ts` is kebab-case, `.ts` with no JSX. Zustand stores are not subject to the main-process `-service` suffix convention.

## Notes / concerns
- The local `omit` helper (lines 82–86) is a small pure utility; it is fine inline, but if other stores grow to need it, it could move to `lib/`. Not worth moving now.
- No relocation or structural change needed — the file is correctly placed and clean.
