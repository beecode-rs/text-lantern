# history

- **Path:** `src/renderer/src/store/history.ts`
- **Layer:** Store
- **Process:** renderer
- **Lines:** 24

## What this file is for
Defines the `useHistoryStore` Zustand store, the renderer's in-memory list of `HistoryEntry` items. It exposes three operations: `load` (fetches history through the IPC bridge), `clear` (asks main to wipe history), and `replace` (overwrites the local array). It is consumed by `App.tsx` (initial load) and the settings `History` screen (display + clear).

## Layer & placement assessment
- **Right layer?** Yes — Zustand state lives in `src/renderer/src/store/` per the architecture doc, and this file holds only store state + the actions that mutate it.
- **Right process boundary?** Yes — only renderer-safe imports: `zustand`, the renderer `api` bridge, and a type from `shared/types`. No Electron, React, or DOM leakage.
- **Dependency direction ok?** Yes — imports `shared` types and the renderer `api` (sibling layer); imported only by `App.tsx` and `components/settings/History.tsx` (components → store), which is the allowed direction.
- **Folder naming (singular rule):** OK — `store/` is singular.
- **File naming:** OK — `history.ts` is kebab-case (single word); the `-service` suffix rule does not apply to Zustand stores. Sibling stores (`models.ts`, `settings.ts`, `test.ts`) follow the same convention.

## Notes / concerns
- `clear` calls `api.clearHistory()` but never resets `entries` to `[]`, so the UI keeps stale rows until the next `load()`. A logic nit, not a placement issue.
- Clean, single-purpose, no comments — correctly placed; no changes recommended.
