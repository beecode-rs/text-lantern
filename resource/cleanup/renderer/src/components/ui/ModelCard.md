# ModelCard

- **Path:** `src/renderer/src/components/ui/ModelCard.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 63

## What this file is for

Exports two presentational components used by the Models settings tab. `ModelCard` renders a single installed voice row — name, "in use" badge, language, byte size, a "missing .json" warning, and a delete button. `DownloadRow` renders an in-progress voice download with a name and a percentage progress bar. Both are dumb, prop-driven, and free of any business or IPC logic.

## Layer & placement assessment
- **Right layer?** Yes — pure presentational primitives, exactly what `components/ui/` is for; the architecture doc names `ModelCard` explicitly as a UI primitive.
- **Right process boundary?** Yes — only React/JSX and `lucide-react`; no Electron native, no `ipcRenderer`/`ipcMain`, no `window` access.
- **Dependency direction ok?** Yes — imports a sibling UI primitive (`StarBadge`), a renderer `lib` helper (`formatService`), and `shared` types/data (`Voice`, `ttsLanguageName`). All downstream of components; no upward or circular imports.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/ui/` (both `components` and `ui` are plural); the project CLAUDE.md rule requires singular folders. This is a codebase-wide pattern, not specific to this file.
- **File naming:** NOTE — `PascalCase.tsx`; the `writing-clean-ts` convention is `kebab-case.tsx` (e.g. `model-card.tsx`) with the component exported as `PascalCase`. Consistent with the rest of the renderer's component files, but technically off-convention.

## Notes / concerns
- Two components in one file (`ModelCard` + `DownloadRow`); the clean-TS "one element per file" convention prefers each in its own file. `DownloadRow` is a distinct concern (download progress vs. installed-voice row) and would naturally live in `download-row.tsx` / `DownloadRow.tsx`. Low-stakes; only `DownloadModels.tsx` imports `DownloadRow`, so a split is trivial.
