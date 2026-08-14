# api

- **Path:** `src/renderer/src/api.ts`
- **Layer:** Lib
- **Process:** renderer
- **Lines:** 3

## What this file is for
Exports a single typed `api` binding that is the renderer's view of the IPC bridge the preload script injects onto `window.api` via `contextBridge`. It casts the untyped `window` reference to `TtsApi` so every renderer consumer (stores, components) gets the typed contract defined in `shared/types.ts` without repeating the cast. It owns no logic — it is pure typed forwarding, the renderer-side counterpart to `src/preload/index.ts`.

## Layer & placement assessment
- **Right layer?** Yes — the architecture doc explicitly carves out `src/renderer/src/api.ts` as the typed accessor for `window.api`, a peer to `lib/` at the renderer root. It is a renderer helper with no JSX, so "Lib" is the closest classification.
- **Right process boundary?** Yes — it references `window`, which is renderer-only, and imports nothing process-specific. It correctly does not touch `ipcRenderer` (that lives in preload).
- **Dependency direction ok?** Yes — its only import is `@src/shared/types` (`TtsApi`), which `shared` allows everyone to import. No upward or circular imports.
- **Folder naming (singular rule):** OK — the file lives at the renderer root (`src/renderer/src/`), not under any plural folder.
- **File naming:** OK — `api.ts` is kebab-case (single word), uses `.ts` (no JSX), and needs no `-service` suffix since it is not a service singleton.

## Notes / concerns
- `export const api = ...` looks like an "exported instance," but this is the intended pattern here: `window.api` is inherently a single bridge object created by the preload, so binding it once as a typed accessor is correct, not an anti-pattern.
- Minor: the cast `(window as unknown as { api: TtsApi }).api` duplicates the `{ api: TtsApi }` shape that `vite-env.d.ts` or a global `Window` augmentation could declare once, letting the file shrink to `export const api = window.api`. Not a placement issue, just a tidiness nit.
