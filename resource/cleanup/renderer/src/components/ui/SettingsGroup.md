# SettingsGroup

- **Path:** `src/renderer/src/components/ui/SettingsGroup.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 52

## What this file is for
A presentational wrapper that renders a titled, bordered settings section with an optional description, plus a `Row` sub-component for laying out a single labeled setting item — either inline (label left, control right) or stacked. It is consumed by all settings tab screens (`General`, `History`, `Languages`, `Test`) to keep their visual layout consistent. It is dumb and composable: no state, no hooks, no business logic, no external renderer imports.

## Layer & placement assessment
- **Right layer?** Yes — `components/ui/` is exactly the designated home for reusable presentational primitives, and this file is consumed by multiple unrelated settings screens.
- **Right process boundary?** Yes — pure renderer; the only import is `type { ReactNode } from 'react'`. No `window`, no IPC, no main/preload leakage.
- **Dependency direction ok?** Yes — it imports nothing renderer-internal and depends upward on nothing; only consumers are `components/settings/*` screens, which is the correct direction (settings UI → ui primitive).
- **Folder naming (singular rule):** VIOLATION — lives under `components/ui/`, both of which are plural. CLAUDE.md mandates singular folders; per the architecture doc these are flagged plural offenders (`components`, `ui`).
- **File naming:** NOTE — PascalCase `SettingsGroup.tsx`; the `writing-clean-ts` convention for UI component files is kebab-case (`settings-group.tsx`). `.tsx` is justified (exports JSX).

## Notes / concerns
- **Two components in one file.** Both `SettingsGroup` and `Row` are exported, which breaks the one-element-per-file rule. `Row` is also a very generic name for a `ui/` primitive and collides with common table/grid vocabulary — it should live in its own file and be renamed to something settings-scoped (e.g. `settings-row.tsx` exporting `SettingsRow`).
- **Return type nit.** `React.JSX.Element` leans on the global `React` namespace while the modern runtime already imports `ReactNode` from `'react'`; using `ReactElement` from `'react'` (or dropping the explicit annotation and letting inference work) would be more consistent. Non-blocking.
