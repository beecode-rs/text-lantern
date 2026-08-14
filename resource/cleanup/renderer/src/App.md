# App

- **Path:** `src/renderer/src/App.tsx`
- **Layer:** Component (React root)
- **Process:** renderer
- **Lines:** 86

## What this file is for
The renderer's top-level React component. It owns the active settings-section state, applies the selected theme, wires the global IPC subscriptions (settings/history changes, model log + progress) into the Zustand stores on mount, and renders the window chrome: the draggable title bar, `Sidebar`, the active settings screen, and the `NowPlaying` bar. It is the composition root for the renderer UI.

## Layer & placement assessment
- **Right layer?** Yes — the architecture explicitly designates `App.tsx` as the React root; it composes layout and delegates logic to stores/lib.
- **Right process boundary?** Yes — only renderer-side imports (React, `components`, `store`, `lib`, `api`). No `ipcMain`/`ipcRenderer`/Electron-native modules leak in.
- **Dependency direction ok?** Yes — root → components/store/lib/api, all downward. `components` consume `store`/`lib`, never the reverse.
- **Folder naming (singular rule):** OK — the file sits at the renderer-src root (`src/renderer/src/`), not under any folder, so its own placement is clean. (It does import from the plural `components`/`components/settings`, but those violations belong to those folders' reports, not this file.)
- **File naming:** OK (NOTE) — `.tsx` is correct (exports JSX). `App.tsx` is PascalCase rather than the project's `kebab-case`, but it is the framework-mandated React entry point (electron-vite/Vite), so the convention exception is accepted.

## Notes / concerns
- Local helper component `Section` shares its name with the imported `type Section` from `Sidebar`. TypeScript keeps them in separate namespaces so it compiles, but a value and a type with the same identifier in one file is confusing; renaming the helper (e.g. `SettingsRouter`) would read more clearly.
- The `useEffect` does a fair amount of subscription wiring (four `api.on*` listeners + two store loads). It is acceptable for a root component, but if the effect grows it would fit better as a `useAppSubscriptions` hook under `lib/`, keeping `App.tsx` purely presentational.
