# Languages

- **Path:** `src/renderer/src/components/settings/Languages.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 247

## What this file is for

The "Languages" settings tab. It renders the language-to-voice-to-shortcut binding table (add/remove/edit rows, detect conflicts across bindings plus the auto/stop shortcuts), the fallback-language picker, and the auto-detect/stop global shortcuts. All mutations are pushed into `useSettingsStore().update`, and the voice list is loaded from `useModelsStore`. It is consumed solely by `App.tsx` as one tab of the settings screen.

## Layer & placement assessment
- **Right layer?** Yes — a settings tab screen, exactly what `components/settings/` is for per the architecture doc.
- **Right process boundary?** Yes — only renderer-side imports (React, `lucide-react`, renderer stores, `components/ui`, `@src/shared/*`). No Electron `app`/`BrowserWindow`, no `ipcRenderer`, no `ipcMain`.
- **Dependency direction ok?** Yes — `components` → `ui` / `store` / `shared`, all downstream. `App.tsx` is the only importer. No upward or circular edges.
- **Folder naming (singular rule):** VIOLATION — lives under two plural folders, `components/` and `settings/`. Per CLAUDE.md both should be singular (`component/settings/` is still a plural child; the whole path would be `component/setting/`). Flagged by the architecture doc as known plural-folder violations.
- **File naming:** NOTE — `Languages.tsx` is PascalCase; `writing-clean-ts` mandates `kebab-case.tsx` for UI components (e.g. `languages.tsx`). Consistent with the other files in this folder (`About.tsx`, `Models.tsx`, …), so it is a codebase-wide convention deviation, not a one-off.

## Notes / concerns
- `Languages.tsx` exports `LanguagesSettings`, so the kebab-case rename would be `languages-settings.tsx` (export `<LanguagesSettings />`), or fold the `Settings` suffix into the folder context and rename to `languages.tsx`.
- `BINDING_GRID` is a string layout constant at module scope — fine here, but if a second settings tab needs the same grid it should be lifted into `components/ui` rather than duplicated.
- `crypto.randomUUID()` for new binding IDs is renderer-safe in modern Electron; just noting the dependency on a secure context.
