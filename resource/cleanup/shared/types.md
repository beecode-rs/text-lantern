# types

- **Path:** `src/shared/types.ts`
- **Layer:** Shared types
- **Process:** shared
- **Lines:** 146

## What this file is for
The single source of truth for Text Lantern's cross-process type contract. It declares the `TtsApi` interface that the preload implements and the renderer/main consume, plus every DTO that flows across that boundary: `Settings`, `LanguageBinding`, `Voice`/`RemoteVoice`, `HistoryEntry`, and the `TtsStatus` discriminated union. It is pure types with no runtime code, and is imported by all four processes.

## Layer & placement assessment
- **Right layer?** Yes — the architecture doc names `src/shared/types.ts` as the home for the IPC contract and cross-process DTOs; this file is exactly that.
- **Right process boundary?** Yes — the file has zero import statements, so nothing process-specific (no Electron `app`/`BrowserWindow`, no React, no `ipcMain`/`ipcRenderer`) leaks in. Safe to import from main, preload, renderer, and shared alike.
- **Dependency direction ok?** Yes — `shared` imports nothing, everyone imports `shared` (confirmed: importers span `main/{index,util,business/service,controller}`, `preload/index`, and `renderer/{api,store,lib,components}`). No upward or circular dependencies possible.
- **Folder naming (singular rule):** OK — lives directly under the singular `shared/` folder; no plural path segments.
- **File naming:** OK — `types.ts` is the conventional name for a pure shared-types module (not a service, so no `-service` suffix applies); `.ts` is correct since the file exports no JSX.

## Notes / concerns
- Style nit only (not a placement issue): the file is heavily annotated with JSDoc block comments, which the project's `writing-clean-ts` standard disallows ("zero tolerance for comments"). For a shared IPC contract these read as intentional documentation of cross-process DTO semantics, so an exception is defensible — but if the no-comments rule is applied strictly, the docstrings would need to move out of the source.
