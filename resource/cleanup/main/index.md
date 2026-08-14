# index

- **Path:** `src/main/index.ts`
- **Layer:** Composition root
- **Process:** main
- **Lines:** 176

## What this file is for
The Electron main-process entry point and composition root. It owns the app lifecycle: migrates legacy user data on first run, creates the `BrowserWindow`, initialises and wires the singleton services (`settings`, `history`, `shortcuts`, `tray`, `tts`), registers IPC through `ipcService`, and installs the app-level handlers (`whenReady`, `before-quit`, `will-quit`, `window-all-closed`, single-instance lock). It also performs the cross-service glue (reflecting TTS status into the tray, prewarming the first bound voice) without itself owning any business rules.

## Layer & placement assessment
- **Right layer?** Yes — this is the documented composition root (`src/main/index.ts`); it only orchestrates lifecycle and wiring, holding no business rules of its own.
- **Right process boundary?** Yes — every Electron main-only import (`app`, `BrowserWindow`, `nativeImage`, `nativeTheme`, `shell`, `systemPreferences`) and Node built-in (`node:fs`, `node:path`, `node:url`) belongs in main; nothing renderer/preload-specific leaks in.
- **Dependency direction ok?** Yes — imports flow strictly `index → controller (ipcService) → service → util → shared/types`; referenced only by `package.json` and `electron.vite.config.ts` as the entry, never imported by app code, so no upward or circular edge.
- **Folder naming (singular rule):** OK — lives directly under singular `src/main/` with no offending folder segment.
- **File naming:** OK — `index.ts` is the genuine Electron entry/composition root here, not a barrel re-export, so the writing-clean-ts "no barrel index.ts" rule does not apply.

## Notes / concerns
- `_reflectReadingStateInTray` is a thin cross-service bridge that subscribes to `ttsService.events` and calls `trayService.setReading`. Acceptable at the composition root today, but `tray-service` is already the documented intentional exception allowed to know about native UI; if more tts→tray couplings appear, move the subscription into `tray-service` rather than letting it accrete here.
- `_migrateLegacyUserData` is one-shot `fs` migration logic inline in the entry. Fine while tiny; if it grows (more legacy paths, version checks), promote it to a `migration-service` under `business/service/` or a util.
- `_resolveBackgroundColor` reads `nativeTheme` directly and the two colour constants live inline next to it. Harmless now, but if main-side theme handling expands, lift it into a small service/util instead of expanding this file.
