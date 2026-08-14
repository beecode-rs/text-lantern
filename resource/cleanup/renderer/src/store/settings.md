# settings

- **Path:** `src/renderer/src/store/settings.ts`
- **Layer:** Store
- **Process:** renderer
- **Lines:** 23

## What this file is for
This is the Zustand store for the app's user settings (the `Settings` DTO from `@src/shared/types`). It holds the current `settings` value and exposes three actions: `load()` fetches settings via `api.getSettings()`, `update()` persists a partial patch via `api.updateSettings()` (both replacing local state with the server response), and `replace()` sets state directly without an IPC round-trip. It is consumed by `App.tsx` and the `components/settings/*` screens.

## Layer & placement assessment
- **Right layer?** Yes — it is a Zustand state store under `renderer/src/store/`, exactly where the architecture places renderer state.
- **Right process boundary?** Yes — renderer-only; imports just `zustand`, the shared `Settings` type, and the renderer-side `api` IPC bridge. No `ipcRenderer`, `window`, main, or preload leaks.
- **Dependency direction ok?** Yes — store → `api` (renderer sibling) → shared types; components import the store, never the reverse. No upward/circular import.
- **Folder naming (singular rule):** OK — `store` is singular.
- **File naming:** OK — `settings.ts` is kebab-case; no `-service` suffix applies (Zustand store hook, not a main-process service singleton).

## Notes / concerns
- The store talks to `api` directly, which is the accepted renderer pattern here (there is no renderer service layer). Worth noting only because `load`/`update` embed IPC orchestration in the store; if settings logic grows (validation, defaults merging, retry), that orchestration would belong in a renderer `lib/` helper rather than the store.
- All four `interface` methods use `async` for the two IPC actions and a sync setter for `replace` — consistent and clean.
