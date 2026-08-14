# Models

- **Path:** `src/renderer/src/components/settings/Models.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 137

## What this file is for
This is the "Models" settings tab — the installed-voices management screen. It renders the list of installed Piper voices with a filter input, shows active downloads as progress rows, surfaces a "Piper engine not found" warning with an install button, and swaps to the `DownloadModels` catalog screen when the user clicks "Download voices". State comes from the `models` Zustand store (`useModelsStore`); voice rows are drawn with the `ModelCard` / `DownloadRow` UI primitives.

## Layer & placement assessment
- **Right layer?** Yes — it is a settings tab screen, and the architecture explicitly places those under `components/settings/`.
- **Right process boundary?** Yes — React/JSX only; no Electron, `ipcMain`, `ipcRenderer`, or `window.api` imports. All main-process interaction goes through the store.
- **Dependency direction ok?** Yes — component → `store` + `components/ui` primitives + a sibling settings screen. Nothing reaches into `main`/`preload`/`shared` runtime; direction is strictly downward within the renderer.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/settings/` (both `components` and `settings` are plural; CLAUDE.md mandates singular folders, e.g. `component/setting/`).
- **File naming:** NOTE — `Models.tsx` is PascalCase; writing-clean-ts mandates `kebab-case` filenames (`models.tsx`). The PascalCase export `ModelsSettings` is correct for a component; only the filename is off. `.tsx` is justified (exports JSX).

## Notes / concerns
- The whole `components/settings/` folder is non-conformant together (siblings like `DownloadModels.tsx` share the same casing/plural issues), so renaming should be done as a batch rather than for this file alone — target `component/setting/models.tsx` exporting `ModelsSettings`.
- Minor: `downloadingNames = Object.keys(progress)` is computed outside `useMemo` and then listed as a dep; it re-runs every render. Cheap, but folding the `Object.keys` call inside the memo would be cleaner.
- `onBack` is inlined as `() => { setView('installed') }`; fine here, but if reused it could be extracted to a named handler.
