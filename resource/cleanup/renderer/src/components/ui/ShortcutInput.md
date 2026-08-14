# ShortcutInput

- **Path:** `src/renderer/src/components/ui/ShortcutInput.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 67

## What this file is for
A reusable button that captures a keyboard shortcut from the user. When clicked, it enters a "listening" mode, intercepts the next `keydown` globally via `window`, converts it to an Electron accelerator string through `acceleratorService`, and calls `onChange`. In its idle state it renders the currently bound shortcut (formatted by `formatService`) or a placeholder. It also accepts `conflict` and `disabled` flags to alter its presentation.

## Layer & placement assessment
- **Right layer?** Yes — a dumb, composable presentational primitive that belongs exactly in `components/ui/` alongside `Select`, `Slider`, `Toggle`, etc.
- **Right process boundary?** Yes — uses only renderer-safe APIs (`React`, `window`, `useState`/`useEffect`); no `ipcRenderer`, Electron main, or Node imports.
- **Dependency direction ok?** Yes — imports flow strictly downward: `components/ui` → `lib` (`accelerator`, `format`). No store, no component, no upward import.
- **Folder naming (singular rule):** VIOLATION — lives under two plural folders: `components` and `ui` (should be `component/ui` is impossible, so at minimum `component` for the parent). Both are flagged as plural in the architecture doc.
- **File naming:** NOTE — `ShortcutInput.tsx` is PascalCase, consistent with every sibling in `components/ui/` (`ModelCard.tsx`, `Select.tsx`, …) but diverges from the project's documented `kebab-case` convention (rule 5). `.tsx` is correctly used since the file exports JSX.

## Notes / concerns
- The plural-folder issue is repo-wide (`components`, `settings`, `ui`, `assets`, `styles` are all plural) and cannot be fixed in isolation; it is an architectural-level cleanup, not a per-file action.
- The PascalCase filename matches the established renderer convention, so renaming this one file alone would create inconsistency — flag it only at the time the renderer is brought into line with `kebab-case`.
- Minor: the inline `className` ternary chain is dense but acceptable for a primitive; no logic to extract.
