# Slider

- **Path:** `src/renderer/src/components/ui/Slider.tsx`
- **Layer:** UI primitive
- **Process:** renderer
- **Lines:** 32

## What this file is for
A reusable, presentational range-slider primitive that renders a styled `<input type="range">` paired with a fixed-width value label. It is fully controlled by its parent via `value`/`onChange` props, with an optional `format` callback for customizing the displayed value (e.g. percent, speed multiplier). It owns no state and no business logic — pure dumb, composable UI for settings screens to reuse.

## Layer & placement assessment
- **Right layer?** Yes — explicitly a dumb presentational primitive, exactly what `components/ui/` is designated for per the architecture doc (`Select`, `Slider`, `Toggle`, …).
- **Right process boundary?** Yes — pure React/JSX, no `window`, IPC, Electron, or main/preload imports; stays entirely within the renderer.
- **Dependency direction ok?** Yes — the file imports nothing at all (not even `React`, relying on the automatic JSX runtime), so there is no upward or cross-layer dependency.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components/ui/` (both `components` and `ui` are plural); per CLAUDE.md these should be singular (e.g. `component/ui/` or a single `ui-primitive/`).
- **File naming:** NOTE — `Slider.tsx` is PascalCase; writing-clean-ts specifies `kebab-case.tsx` for UI components (`slider.tsx`). The `.tsx` extension is justified (exports JSX). Naming is at least consistent with the sibling primitives in this folder, so any fix should be folder-wide.

## Notes / concerns
- No defaults for `min`/`max`/`step`, so every call site must supply all of them — fine for controlled settings usage, just worth noting if a generic default set was intended.
- `value` falls back to raw number rendering when no `format` is passed; consider whether callers should always format for a consistent UX, but this is a product call, not a placement issue.
