# piper-server-service

- **Path:** `src/main/business/service/piper-server-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 329

## What this file is for
Owns the lifecycle of the spawned Piper TTS Python process: spawning with a model path, speaking the length-prefixed binary framing protocol over stdio (READY/AUDIO/END/ERROR frames), serializing startup (single in-flight `ensureReady`, retries with startup timeout), and cancelling/tearing down the child. It exposes a `piperServerService` singleton consumed by `tts-service`. All IPC with the external process happens here so the rest of the app never touches `child_process`.

## Layer & placement assessment
- **Right layer?** Yes — pure business/process-management logic with no IPC wiring or UI; belongs in `business/service/`.
- **Right process boundary?** Yes — only `node:child_process` and `@src/main/util/paths-service`; no Electron, no `ipcMain`/`ipcRenderer`, no React. Main-only.
- **Dependency direction ok?** Yes — service → util (`pathsService`); the sole consumer is a sibling service (`tts-service`), which is an allowed same-layer call.
- **Folder naming (singular rule):** OK — `main`, `business`, `service` are all singular.
- **File naming:** OK — `kebab-case` with the `-service` suffix.

## Notes / concerns
- **Ternaries (clean-TS code-style violation).** Several prohibited ternary operators: `sampleRate = typeof rate === 'number' && rate > 0 ? rate : DEFAULT_SAMPLE_RATE`, `throw lastError instanceof Error ? lastError : new Error(...)`, and `err instanceof Error ? err : new Error(String(err))` (x2). Rewrite as `if/else` or extract a small named helper (e.g. `_toError(value: unknown): Error`).
- **`FrameReader` class co-located with the service.** The "one element per file" convention keeps one class/object per file; `FrameReader` is a distinct unit and could live in its own file (e.g. a `frame-reader.ts` private to this folder, or a subfolder). Minor — it is small and tightly coupled, so the current co-location is defensible.
- **Module-level mutable state.** The singleton state (`child`, `busy`, `dead`, `readyResolve`, `ensureChain`, `queue`, `waiters`, …) is held in plain `let`s at module scope rather than inside a class/object. Functionally fine for a process-singleton, but encapsulating it would make the surface easier to test and reason about; the module globals are what currently prevents that.
