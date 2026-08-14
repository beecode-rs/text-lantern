# About

- **Path:** `src/renderer/src/components/settings/About.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 81

## What this file is for
The "About" settings tab screen. It renders the app identity block (icon, name, version, on-device blurb), lists the user's configured language bindings by fetching `api.getSettings()` once on mount, and shows static credits/links to Piper TTS, the voice repositories, and Handy. It is a pure presentational screen with no settings mutation.

## Layer & placement assessment
- **Right layer?** Yes — it is a settings tab screen and sits in `components/settings/` exactly where the architecture places settings screens.
- **Right process boundary?** Yes — only renderer imports (`api`, a renderer asset) and `shared` (`types`, `languages`). No `ipcRenderer`, `ipcMain`, or main-process leaks.
- **Dependency direction ok?** Yes — component → `renderer/api` → preload/main, and component → `shared/*`. All downward; `shared` imports nothing process-specific here.
- **Folder naming (singular rule):** VIOLATION — lives under `components/settings/`; both `components` and `settings` are plural. Per the CLAUDE.md project rule, folders should be singular (e.g. `component/setting/`).
- **File naming:** NOTE — `About.tsx` is PascalCase; the writing-clean-ts convention is kebab-case (`about.tsx`). The export `AboutSettings` also does not match the basename, suggesting the file should be `about-settings.tsx` (or the export renamed to `About`).

## Notes / concerns
- Folder-naming fix is structural (`components`/`settings` → `component`/`setting`) and applies repo-wide, not just here; flag for a batch rename.
- File/kebab-case + export-name alignment is a cleanup nit: rename to `about-settings.tsx` to match `AboutSettings`, or rename the export to `About` to match the current basename.
