# Test

- **Path:** `src/renderer/src/components/settings/Test.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 143

## What this file is for
The "Test" settings tab screen — a `TestSettings` component that lets the user pick a connected language, edit sample text, and speak or stop it through the Piper TTS engine. It derives the "connected" language→voice bindings (only those whose voice is actually downloaded), resolves the active language (honoring `auto` with the fallback-language voice), and mirrors live TTS status (`idle`/`synthesizing`/`reading`) on the Speak/Stop button. It is one of the tab screens rendered by `App.tsx` and otherwise owns no state beyond the local status subscription.

## Layer & placement assessment
- **Right layer?** Yes — it is a settings tab screen and lives in `components/settings/`, the documented home for settings screens.
- **Right process boundary?** Yes — renderer-only; it reaches the main process exclusively through the typed `api` bridge (`api.speak`, `api.stop`, `api.onTtsStatus`). No `ipcRenderer`, `window`, or Electron-main imports.
- **Dependency direction ok?** Yes — imports flow component → store (`settings`, `models`, `test`) → UI primitive (`SettingsGroup`) → shared (`ttsLanguageName`, `TtsStatus`) → `api`. All downward; no upward or circular edges.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/settings/` (both segments plural). CLAUDE.md requires singular folders; the target would be `component/setting/`. This is a codebase-wide pattern, not specific to this file.
- **File naming:** NOTE — `Test.tsx` is PascalCase; writing-clean-ts mandates `kebab-case`, and the export is `TestSettings`, so `test-settings.tsx` would align name↔export. `.tsx` is justified (exports JSX). Sibling screens (`General.tsx`, `Languages.tsx`, …) share this off-convention pattern, so it is consistent within the folder.

## Notes / concerns
- Rename to `test-settings.tsx` to satisfy kebab-case and match the `TestSettings` export in one move.
- The binding/language/auto-label derivation is fairly dense for a settings screen. It is purely presentational (no persistence, no IPC beyond speak/stop), so it is defensible here; if the same resolution is needed elsewhere, extract it to a `lib/` helper rather than duplicating.
