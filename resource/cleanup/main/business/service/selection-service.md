# selection-service

- **Path:** `src/main/business/service/selection-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 96

## What this file is for
Owns grabbing the user's currently selected text on macOS by simulating Cmd+C via an AppleScript that polls the pasteboard's `changeCount`, then restoring the prior clipboard contents. It also translates osascript failures (permission-denied markers vs. other errors) into user-facing messages using `APP_NAME` from constants. Everything selection-related that the rest of the main process needs goes through `selectionService.grab()`.

## Layer & placement assessment
- **Right layer?** Yes — `selection` is explicitly listed in the architecture doc as one of the `business/service/` singletons, and this file holds the business rules for capturing a selection (no IPC wiring, no orchestration).
- **Right process boundary?** Yes — uses `electron`'s `clipboard` and `node:child_process`, both main-process-only, and lives under `src/main/`. No `ipcMain`/`ipcRenderer`/React leakage.
- **Dependency direction ok?** Yes — imports only `@src/main/util/constants` (service → util, allowed). The sole consumer is `tts-service.ts`, a peer in the same `service/` layer (lateral, not upward/circular).
- **Folder naming (singular rule):** OK — `src/main/business/service/` is all singular (`business`, `service`).
- **File naming:** OK — `selection-service.ts` is kebab-case with the `-service` suffix; exports the `selectionService` camelCase singleton.

## Notes / concerns
- Placement is clean; nothing to move. Two logic nits worth flagging for a future pass (not layer issues):
  - On non-darwin platforms the file skips the AppleScript copy entirely and just returns `clipboard.readText().trim()` — i.e. whatever was already on the clipboard, not an actual selection grab. If the app ever targets non-macOS this will silently return stale clipboard content.
  - `grab()` has no parameters, so the object-params convention doesn't apply here, but the private helpers already follow it (`{ source }`, `{ saved }`, `{ stderr }`) — consistent with the `writing-clean-ts` standard.
