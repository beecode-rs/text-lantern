# ipc-service

- **Path:** `src/main/controller/ipc-service.ts`
- **Layer:** Controller
- **Process:** main
- **Lines:** 114

## What this file is for
This is the main-process IPC controller — the only place allowed to import both Electron's `ipcMain` and the domain services. It registers `ipcMain.handle` handlers for every renderer→main call (settings, models, tts, shortcuts, history, app:showSettings), translating each IPC payload into a service call, and it forwards main→renderer pushes (`tts:status`, `tts:audioChunk`, `history:changed`, `settings:changed`) by subscribing to service events and re-emitting them via `webContents.send`. It is consumed once, by the composition root `index.ts`, via `ipcService.register(() => mainWindow)`.

## Layer & placement assessment
- **Right layer?** Yes — the architecture doc names `controller/` as the bridge that imports both `ipcMain` and services; this file does exactly that and nothing more.
- **Right process boundary?** Yes — `ipcMain` and `BrowserWindow` (main-process only APIs) are the only Electron imports; services come from `@src/main/business/service/*`; DTOs (`HistoryEntry`, `Lang`) from `@src/shared/types`. No renderer/preload leakage.
- **Dependency direction ok?** Yes — controller → service → util one-way. The sole importer is `src/main/index.ts` (composition root); no service imports this controller.
- **Folder naming (singular rule):** OK — `controller` is singular; parents `main`, `business`, `service` are all singular.
- **File naming:** OK — `kebab-case` with `-service` suffix matching the exported `ipcService` singleton.

## Notes / concerns
- The `settingsService.onChange` block performs real cross-service orchestration (re-register shortcuts, refresh tray, prune history, push to renderer). That is wiring of reactions rather than business rules, so it is tolerable in the controller, but if it grows it is the natural candidate to extract into a small orchestration/use-case step.
- Fire-and-forget calls like `void ttsService.speak(...)` and `void ttsService.stop()` swallow rejections with no error path — a robustness nit, not a layering issue.
