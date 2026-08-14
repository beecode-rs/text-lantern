# history-service

- **Path:** `src/main/business/service/history-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 111

## What this file is for

Owns the in-memory list of recently-read texts (`HistoryEntry[]`) for the main process, backed by a JSON file in the user-data dir. It is responsible for loading/persisting that list, enforcing the configurable retention limit (read live from `settingsService`), and exposing `init`/`get`/`add`/`clear`/`prune` plus an `events` emitter so listeners (controller/renderer) can react to changes. Pure business state and rules — no IPC, no Electron APIs.

## Layer & placement assessment
- **Right layer?** Yes — domain state and rules belong in the service layer; this is exactly `business/service/`.
- **Right process boundary?** Yes — only `node:fs`/`node:crypto`/`node:events` (main-process safe); no Electron `app`/`BrowserWindow`, no `ipcMain`/`ipcRenderer`, no React.
- **Dependency direction ok?** Yes — imports point to a sibling service (`settingsService`), a util (`pathsService`), and shared types (`HistoryEntry`); all one-way and downward. Importers are the composition root (`index.ts`), a peer service (`tts-service`), and the controller (`ipc-service`) — all valid callers.
- **Folder naming (singular rule):** OK — lives under singular `business/service/`.
- **File naming:** OK — `history-service.ts` is kebab-case with the `-service` suffix.

## Notes / concerns
- The file carries several JSDoc blocks (`_limit`, `init`, `add`, `prune`). Under the project's mandated `writing-clean-ts` standard the rule is zero comments/JSDoc — code should be self-documenting. These are the one deviation worth flagging; if enforced strictly, they could be folded into well-named helpers or dropped in favor of the already-descriptive method names.
- Otherwise clean: singleton object export (correct for a service), object-params pattern used on `add`, no `for` loops, no inline arrow functions, no exported class instances.
