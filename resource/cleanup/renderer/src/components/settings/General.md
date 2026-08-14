# General

- **Path:** `src/renderer/src/components/settings/General.tsx`
- **Layer:** Settings UI
- **Process:** renderer
- **Lines:** 98

## What this file is for

The "General" settings tab screen — renders the appearance (theme), speech speed, text-cleaning, and window-behaviour controls. It reads the settings object and the `update` action from the `useSettingsStore` Zustand store and wires each control's `onChange` straight into `update({ field: value })`. It composes reusable UI primitives (`Select`, `Slider`, `Toggle`, `SettingsGroup`/`Row`) into a tab body; no business logic lives here.

## Layer & placement assessment
- **Right layer?** Yes — settings tab screens belong in `components/settings/` per the architecture map, and this file is pure presentation bound to a Zustand store.
- **Right process boundary?** Yes — renderer-only; React JSX, a Zustand store hook, and `@src/shared/types` type import. No `window.api`/IPC, no Electron or Node imports.
- **Dependency direction ok?** Yes — component imports flow downward only: `store/settings` (store), `components/ui/*` (UI primitives), and `shared/types` (shared types). No `lib` → `components` or upward edges.
- **Folder naming (singular rule):** VIOLATION — lives under two plural folders, `components/` and `settings/` (CLAUDE.md requires singular, e.g. `component/setting/`).
- **File naming:** NOTE — `General.tsx` is PascalCase; writing-clean-ts mandates `kebab-case` for files, and the export is `GeneralSettings` so the matching name would be `general-settings.tsx` (`.tsx` is justified — it exports JSX).

## Notes / concerns
- Minor: a single raw `<input type="number">` is used for the character cap while every other field uses a wrapped UI primitive; for consistency it could become a `NumberInput`/`Input` primitive under `components/ui/`.
- Minor: `rateLabel` is a pure helper declared inside the component body (re-created each render); it could move to `components/ui`'s sibling `lib/` (e.g. `lib/format`) so it is testable and not re-allocated per render.
