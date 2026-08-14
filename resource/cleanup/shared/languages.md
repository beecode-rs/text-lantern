# languages

- **Path:** `src/shared/languages.ts`
- **Layer:** Shared data
- **Process:** shared
- **Lines:** 205

## What this file is for
The single source of truth for the languages Text Lantern recognizes: a display-ordered table of `{ code, name }` aligned with `tinyld`'s `detect()` output (ISO 639-1 where one exists, else ISO 639-3). It exposes the merged language list (`TTS_LANGUAGES`), the list accessor (`listTtsLanguages`), and a code→name resolver (`ttsLanguageName`) used by selectors and model cards. It also reads/merges a user-supplied `languages` env var (JSON array) at import time so the built-in set can be extended or renamed without code changes. Both the main process (language detection, model matching, tray label) and the renderer (settings selectors, now-playing cards) consume it, so it must live outside any single process.

## Layer & placement assessment
- **Right layer?** Yes. It is genuinely cross-process (imported by `main/util/lang-service`, `main/business/service/models-service`, `main/business/service/tray-service`, and six renderer components), has no process-specific dependencies, and the architecture doc explicitly names `src/shared/languages.ts` as shared language metadata.
- **Right process boundary?** Yes. Zero imports — no Electron, React, `ipcRenderer`, or `ipcMain`. The private `readEnvVar` helper reads the env via a `globalThis` indirection so the file never references a bare `process` identifier; it typechecks and runs under both the Node (main) and DOM (renderer) tsconfigs and never throws when `process` is absent.
- **Dependency direction ok?** Yes. Shared imports nothing; main and renderer both import shared. Textbook correct downward direction, no cycles.
- **Folder naming (singular rule):** OK. `shared` is a category/mass noun, not a plural — not flagged by the singular-folder rule.
- **File naming:** OK. `languages.ts` is kebab-case (single token) and needs no `-service` suffix since it is not a service singleton.

## Notes / concerns
- The architecture doc describes this file as "language metadata (data)" — that description is now stale. The module bundles a data table (`TTS_LANGUAGES_RAW`), derived types (`TtsLanguage`, `TtsLanguageInfo`), and runtime helpers (`parseUserLanguages`, `mergeLanguages`, `listTtsLanguages`, `ttsLanguageName`, private `readEnvVar`). Placement is still correct (it must be shared), but the doc's one-liner undersells the file's current shape; consider updating the doc to "language metadata + accessors."
- Importing the module has a (defensive, non-throwing) top-level side effect: `USER_LANGUAGES`/`TTS_LANGUAGES` are computed at import time by reading and parsing the env. This is acceptable for a shared data module but means the env var is read once, lazily, on first import — worth knowing if the env is ever expected to change during the app lifetime (it is not, today).
- Style only (not placement): per the project's `writing-clean-ts` standard this file is heavy on JSDoc/block comments and exports several free-standing functions rather than a single grouped object. Refactoring that here would be invasive and is orthogonal to the layer audit; flagging for awareness, not as a placement defect.
