# index

- **Path:** `src/preload/index.ts`
- **Layer:** Preload
- **Process:** preload
- **Lines:** 90

## What this file is for
The Electron preload entry point. It builds the concrete `TtsApi` object that forwards every method to `ipcRenderer.invoke(<channel>, ...)` and every `on*` event subscription to `ipcRenderer.on`, then exposes it to the renderer as `window.api` via `contextBridge`. Two local helpers (`on` / `onVoid`) register a listener and return an unsubscribe function, so renderer callers can tear off subscriptions. It contains no business logic — pure, typed IPC forwarding.

## Layer & placement assessment
- **Right layer?** Yes — this is exactly the Preload layer described in the architecture doc, and the file's responsibility is "the ONLY place that touches `ipcRenderer`".
- **Right process boundary?** Yes — imports only `contextBridge`, `ipcRenderer`, `IpcRendererEvent` from `electron` (all preload-appropriate) and the `TtsApi` type from `@src/shared/types`. No `ipcMain`, `app`, `BrowserWindow`, `nativeImage`, React, or `window` access.
- **Dependency direction ok?** Yes — preload → `shared/types` only. `shared` imports nothing process-specific, so the edge is one-way and clean.
- **Folder naming (singular rule):** OK — lives under singular `src/preload/`.
- **File naming:** OK — `index.ts` is the conventional preload entry name and is required by `electron.vite.config.ts` (`preload.input.index`) plus `src/main/index.ts` (`preload: ../preload/index.mjs`). This is a real entry point, not a barrel re-export, so the skill's "no index.ts barrels" rule does not apply.

## Notes / concerns
- Correctly placed and clean; no relocation recommended.
- IPC channel strings (`'settings:get'`, `'tts:speak'`, etc.) are duplicated as string literals here and on the main side in the controller; the typed `TtsApi` surface in `shared/types.ts` is the contract that keeps them aligned. A shared channel-constant module would remove the duplication, but it is a minor, optional hardening — not a layering violation.
