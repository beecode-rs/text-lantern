# StarBadge

- **Path:** `src/renderer/src/components/ui/StarBadge.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 19

## What this file is for
A small presentational badge that renders an inline-flex span containing a star icon and an uppercase label. It is reused across the model list (`ModelCard`, `RemoteModelRow`) and the Languages settings screen to tag items with status labels like "in use", "installed", and "default". It owns no state and accepts only `children` plus an optional `className`.

## Layer & placement assessment
- **Right layer?** Yes — a dumb, composable presentational primitive is exactly what `components/ui/` is designated for in the architecture doc.
- **Right process boundary?** Yes — imports only `react` (type) and `lucide-react`; no Electron, preload, or main-process APIs.
- **Dependency direction ok?** Yes — a UI primitive imports nothing from `store`/`lib`/other components; it sits at the bottom and is consumed by feature components and settings screens.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components`/`ui`; the CLAUDE.md singular-folder rule wants singular folders (e.g. `component/ui`). The architecture doc explicitly flags both `components` and `ui` as plural offenders.
- **File naming:** NOTE — `StarBadge.tsx` is PascalCase, which matches this project's existing component convention but conflicts with the writing-clean-ts skill's kebab-case preference (`star-badge.tsx`). The `.tsx` extension is correct since the file exports JSX.

## Notes / concerns
- The component itself is clean and correctly placed functionally; the actionable item is the folder-naming violation, which is repo-wide (all of `components`, `ui`, `settings`, `assets`, `styles` are plural) and would be a bulk rename rather than something specific to this file.
- Minor nit: `${className ?? ''}` leaves a stray trailing space when no `className` is passed — harmless, but a `clsx`/`twMerge` helper would tidy it if one is introduced.
