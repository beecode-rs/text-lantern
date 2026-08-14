# History

- **Path:** `src/renderer/src/components/settings/History.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 137

## What this file is for
Renders the "History" settings tab. It binds a retention-limit input to the settings store, lists recent TTS readings from the history store (with expand/collapse previews), and wires per-entry "Replay" (via `api.speak`) and a "Clear" action. It owns no business rules — it only composes store reads, one IPC call, and presentational markup into a screen.

## Layer & placement assessment
- **Right layer?** Yes — a settings tab screen, correctly placed under `components/settings/`.
- **Right process boundary?** Yes — renderer only; imports React, renderer stores/api, a UI primitive, and shared types/data. No `ipcMain`/`window`/Node leakage.
- **Dependency direction ok?** Yes — imports flow downward into `store`, `components/ui`, `lib`-equivalent (`api`), and `shared`; the only importer is `App.tsx` (the React root). No upward or circular edges.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/settings` (both segments are plural; per CLAUDE.md these should be `component/setting`).
- **File naming:** NOTE — `History.tsx` is PascalCase; writing-clean-ts requires `kebab-case` filenames for UI components (i.e. `history.tsx`) even though the exported component stays PascalCase.

## Notes / concerns
- Replay triggers `api.speak(...)` directly from the component. That is renderer-side IPC bridging, acceptable here for a settings screen, but if replay logic grows it belongs in the history store/action, not the view.
- `return <></>` when `settings` is null is fine for a settings tab, though rendering `null` directly is marginally cleaner.
