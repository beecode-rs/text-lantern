# tts-service

- **Path:** `src/main/business/service/tts-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 247

## What this file is for
`ttsService` owns the end-to-end TTS playback lifecycle on the main process. It resolves input text (from an explicit argument or by delegating to `selectionService`), cleans and caps it, picks a voice through `langService`, ensures the Piper model is ready via `piperServerService`, then streams PCM audio chunks (reframed to 4096-byte frames) out through an `EventEmitter` and emits `TtsStatus` state transitions. It also tracks one active playback token so `stop()` / new `speak()` calls can cancel a run in flight, and records each utterance in `historyService`.

## Layer & placement assessment
- **Right layer?** Yes — core domain logic that orchestrates several other services; exactly what the Service layer is for.
- **Right process boundary?** Yes — only Node primitives (`node:events`, `node:fs`, `node:path`) and main-side modules. No `ipcMain`, no `ipcRenderer`, no React/Electron renderer surface.
- **Dependency direction ok?** Yes — imports peer services (`history`, `piper-server`, `selection`, `text`), utils (`lang-service`, `paths-service`), and `@src/shared/types`. Service → service / service → util is the allowed direction. Consumers are `controller/ipc-service.ts`, `index.ts` (composition root), and peer services (`shortcuts-service`, `tray-service`) — all valid callers.
- **Folder naming (singular rule):** OK — lives under singular `service`.
- **File naming:** OK — `tts-service.ts`, kebab-case with the `-service` suffix, no JSX so `.ts` is correct.

## Notes / concerns
- `prewarmVoice` has an empty `catch {}` that silently swallows `ensureReady` failures. Best-effort prewarm is defensible, but a one-line `_noop` or a debug log would make the intent explicit.
- Module-level mutable `let active: object | null = null` holds the playback token as singleton state. Acceptable for a main-process singleton, worth flagging only because it makes the service harder to unit-test in isolation.
- Helpers prefixed with `_` (`_emitTtsStatus`, `_hasText`, `_capTextToMaxLength`, etc.) sit at module scope rather than as private methods on a class. This matches the project's "singleton object on the main side" idiom and sibling services, so it is consistent — not a violation, just stylistically different from the class-based service template in `writing-clean-ts`.
