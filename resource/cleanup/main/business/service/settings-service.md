# settings-service

- **Path:** `src/main/business/service/settings-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 181

## What this file is for
Owns the app's persisted user settings (`Settings`): load-on-init from `settings.json`, in-memory cache, partial update + disk persist, and a pub/sub `onChange` for subscribers. It also performs schema migration from legacy pre-v3 formats (hardcoded sr/en voices, inverted `rate`, separate `shortcuts` object) into the current `languageBindings` shape. Other services (`shortcuts`, `models`, `history`, `tray`) and the composition root read/write through it.

## Layer & placement assessment
- **Right layer?** Yes — singleton domain service holding business rules + state, exactly what `business/service/` is for per the architecture doc.
- **Right process boundary?** Yes — only `node:fs` (allowed in main) and the in-process `pathsService`; no Electron `app`/`BrowserWindow`/`ipcMain`, no renderer/react, no `ipcRenderer`.
- **Dependency direction ok?** Yes — imports only `util/paths-service` (service → util, correct) and `@src/shared/types` (shared, allowed). Importers are the composition root, the controller `ipc-service`, and sibling services — all valid downward or peer edges; no upward import of controller/renderer.
- **Folder naming (singular rule):** OK — `main/business/service/` all singular.
- **File naming:** OK — `settings-service.ts`, kebab-case with the `-service` suffix.

## Notes / concerns
- Heavy JSDoc on private helpers (`_migrateLegacyBindings`, `_migrateLegacyRate`, `_buildSettings`) violates the `writing-clean-ts` "no comments" rule; these are well-named enough to stand on their own. Not a placement issue.
- The file mixes pure migration helpers (could arguably live in a `util` migration module) with the stateful service. Acceptable here since migration only runs at init and is private to this service, but if it grows, extracting `_migrate*` into `util/settings-migration.ts` would tighten the service.
- `console.error` on persist failure is fine for an Electron main process but could route through a logger if/when one is introduced in `util`.
