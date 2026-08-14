# Toggle

- **Path:** `src/renderer/src/components/ui/Toggle.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 28

## What this file is for
A reusable, presentational on/off switch primitive. It renders an accessible `<button role="switch">` (with `aria-checked`/`aria-label`) and a sliding thumb, and reports toggles upward via a controlled `checked`/`onChange` API. It owns no state and no business logic — just pure styling and ARIA wiring.

## Layer & placement assessment
- **Right layer?** Yes — exactly the dumb, composable presentational primitive the `components/ui/` layer is designated for (alongside `Select`, `Slider`, `ModelCard`).
- **Right process boundary?** Yes — pure renderer JSX; no `window`, IPC, Electron, or main/preload imports.
- **Dependency direction ok?** Yes — the file imports nothing at all (leaf node); its sole importer is `components/settings/General.tsx`, a renderer-only consumer.
- **Folder naming (singular rule):** VIOLATION — lives under two plural folders, `components/` and `components/ui/`. Per the CLAUDE.md singular-folder rule, the canonical paths would be `component/ui/...` or, better, a singular `component/primitive/...`.
- **File naming:** OK for this project — PascalCase matches its siblings (`Select.tsx`, `Slider.tsx`, `ModelCard.tsx`) as referenced in the architecture doc, even though it diverges from the generic `kebab-case.tsx` UI-component guideline.

## Notes / concerns
- Uses the global `React.JSX.Element` return type without importing `React`. Works today via `@types/react`'s global namespace + the automatic JSX runtime, but importing the type (or using `JSX.Element` from a named import) would be more explicit and resilient.
- The `aria-label` is passed straight through even when `undefined`; harmless, but a `disabled` state and required-`ariaLabel` guard would make the primitive more robust for other callers.
