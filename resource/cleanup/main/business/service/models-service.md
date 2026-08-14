# models-service

- **Path:** `src/main/business/service/models-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 462

## What this file is for
Owns the Piper voice/engine lifecycle on the main process: lists locally installed voices, checks whether the piper-tts engine is installed, runs the Python venv bootstrap + default voice downloads, and downloads/deletes individual `.onnx` voice models. It also queries the HuggingFace `rhasspy/piper-voices` repo (`searchVoices`) so the renderer can browse remote voices to install. Exposes a single `modelsService` singleton consumed by the IPC controller.

## Layer & placement assessment
- **Right layer?** Yes — pure domain/business logic for the models domain, no IPC or Electron-window concerns, lives under `business/service/` exactly as the architecture prescribes.
- **Right process boundary?** Yes — only Node builtins (`node:fs`, `node:os`, `node:path`, `node:child_process`) and `fetch`; no `ipcMain`, `BrowserWindow`, or `nativeImage` imports, so it stays safely inside main.
- **Dependency direction ok?** Yes — imports flow only to `util` (`paths-service`, `lang-service`), a sibling service (`settings-service`), and `shared` (`languages`, `types`). The sole consumer is `controller/ipc-service.ts`, i.e. controller → service → util, one way.
- **Folder naming (singular rule):** OK — every parent folder (`main`, `business`, `service`) is singular.
- **File naming:** OK — `models-service.ts` is kebab-case with the `-service` suffix matching the convention for service singletons.

## Notes / concerns
- The file is large (462 lines) because it bundles engine bootstrap, voice download, voice listing, and HuggingFace search. The many module-private `_`-prefixed helpers are coherent, but if it grows further, consider splitting the HF remote-search helpers into a sibling file (e.g. `models-service/remote-voice-search.ts`) under a `models-service/` subfolder, keeping the public `modelsService` object as the single entry point.
- Per the project's `writing-clean-ts` standard, comments are disallowed (code should be self-documenting). This file currently carries several JSDoc blocks (`_resolveLangCode`, `_entryToRemoteVoice`, `searchVoices`) and a couple of inline comments; they are informational today but would need to be removed/refactored to comply with the zero-comment rule.
- `deleteVoice` uses `['onnx', 'onnx.json'].forEach(...)` for side-effects; acceptable (no `for` loop), but a `.map()` returning a status array (or simply two explicit `fs.rmSync` calls) would read more cleanly and align with the skill's transformation-style preference.
