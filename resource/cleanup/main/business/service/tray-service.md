# tray-service

- **Path:** `src/main/business/service/tray-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 81

## What this file is for
Owns the native menu-bar `Tray` lifecycle and its context menu for the main process. It builds the tray menu (read-selection items, language bindings, stop, settings, quit) from current settings, swaps the tray icon/tooltip between idle and reading states, and exposes `create`/`refreshMenu`/`setReading`/`destroy` to the composition root and IPC controller. It is the architecture's one acknowledged service that holds a reference to the `BrowserWindow`.

## Layer & placement assessment
- **Right layer?** Yes — it is a singleton domain service holding state (`tray`, `trayWindow`) and menu business rules, consumed by the controller (`ipc-service.ts`) and composition root (`index.ts`).
- **Right process boundary?** Yes — imports `Tray`/`Menu`/`BrowserWindow` from `electron`, which are main-process-only APIs, and the file lives under `src/main/`. The `BrowserWindow` reference is the documented intentional exception for this service.
- **Dependency direction ok?** Yes — flows `service → service` (`tts-service`, `settings-service`), `service → util` (`constants`, `tray-icon-image`), and `service → shared` (`languages`, `types`). No util/shared reaches back up, no circular edges.
- **Folder naming (singular rule):** OK — path segments `main`/`business`/`service` are all singular.
- **File naming:** OK — `tray-service.ts` is kebab-case with the `-service` suffix; no JSX, so `.ts` is correct.

## Notes / concerns
- Module-level `let tray` / `let trayWindow` mutable state is acceptable here as the singleton's owned state, but it makes the service hard to test in isolation; if testability becomes a goal, lift the state into a class instance and inject the window.
