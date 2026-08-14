# Select

- **Path:** `src/renderer/src/components/ui/Select.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 35

## What this file is for
A generic, reusable presentational `<select>` dropdown plus its `SelectOption<Value>` type. It renders a native HTML `<select>` from a typed options list and forwards the picked value through `onChange`. It is intended as the one shared select component for renderer screens (currently consumed by `components/settings/General.tsx`).

## Layer & placement assessment
- **Right layer?** Yes — a dumb, composable presentational primitive; exactly what `components/ui/` exists for (the architecture doc names `Select` explicitly).
- **Right process boundary?** Yes — pure React, no Electron/IPC/`window`/store access; renderer-only.
- **Dependency direction ok?** Yes — leaf component, imports nothing; only used by a settings feature component, so the edge points the correct way (feature → ui).
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/ui/`; CLAUDE.md mandates singular folders (the architecture doc flags both `components` and `ui` as plural).
- **File naming:** NOTE — `Select.tsx` is PascalCase; writing-clean-ts specifies `kebab-case.tsx` for UI components (`select.tsx`). This matches every sibling in the folder, so it should be renamed together with them, not in isolation.

## Notes / concerns
- If the singular-folder rule is enforced, relocate the whole primitives tree in one pass (e.g. `components/ui/` → `component/ui/` or `component/primitive/`) rather than moving this file alone — keeps the group intact and avoids touching every importer twice.
- The inline `onChange` arrow and the inline `className` are acceptable for a presentational primitive; no business logic to extract.
