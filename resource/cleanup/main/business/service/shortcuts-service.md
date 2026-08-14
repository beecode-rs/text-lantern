# shortcuts-service

- **Path:** `src/main/business/service/shortcuts-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 65

## What this file is for
Owns registration and teardown of the app's global OS-level keyboard shortcuts (per-language speak, auto-speak, stop). `registerAll` reads the current settings, wipes any previously registered accelerators, and registers each configured shortcut so that pressing one triggers the corresponding `ttsService` action. `unregisterAll` is the safe teardown path used at quit/re-register time.

## Layer & placement assessment
- **Right layer?** Yes — `shortcuts` is one of the domain services the architecture explicitly sanctions, and this file holds the registration business rules for it.
- **Right process boundary?** Yes — `app` and `globalShortcut` are main-process Electron APIs and this file lives in `src/main/`; it touches neither the renderer nor IPC channels.
- **Dependency direction ok?** Yes — it imports only sibling services (`ttsService`, `settingsService`), and is consumed by the composition root (`index.ts`) and the controller (`controller/ipc-service.ts`), all one-way downstream.
- **Folder naming (singular rule):** OK — both `business` and `service` are singular.
- **File naming:** OK — `shortcuts-service.ts` is kebab-case with the `-service` suffix.

## Notes / concerns
- Like `tray-service`, this is a native-Electron-backed service (it calls `globalShortcut` and `app.isReady()` directly rather than wrapping pure logic). That is acceptable here — it is the natural home for this responsibility and the architecture lists `shortcuts` as a first-class service — but it is the same "native-wrapper service" shape as `tray-service`, not a pure-logic service.
- Export shape (`export const shortcutsService = { ... }`) matches the sibling services in this codebase; consistent with the project's existing singleton-object convention.
