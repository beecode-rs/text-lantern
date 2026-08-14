# use-theme

- **Path:** `src/renderer/src/lib/use-theme.ts`
- **Layer:** Lib
- **Process:** renderer
- **Lines:** 41

## What this file is for
A React hook that applies the user's `ThemePreference` (`'system' | 'light' | 'dark'`) to the document by toggling the `dark` class on `<html>`. For the `'system'` preference it subscribes to `prefers-color-scheme: dark` and re-syncs on OS changes, cleaning up the listener on unmount or preference change. It owns no state — it just reflects the passed-in theme onto the DOM.

## Layer & placement assessment
- **Right layer?** Yes — a renderer-only side-effect hook with no JSX belongs in `lib/`, exactly where the architecture doc lists `use-theme`.
- **Right process boundary?** Yes — touches only `window`, `document`, and React; no main/preload/shared-runtime imports.
- **Dependency direction ok?** Yes — imports only React and the shared `ThemePreference` type; imported solely by `src/renderer/src/App.tsx` (component → lib), the correct direction.
- **Folder naming (singular rule):** OK — `lib` is singular, as are all ancestors (`renderer`, `src`).
- **File naming:** OK — `use-theme.ts` is `kebab-case`, uses `.ts` (no JSX), and the `use-` prefix mirrors the `useTheme` hook export; no `-service` suffix applies to a hook.

## Notes / concerns
- Minor style nit vs. the `writing-clean-ts` conventions: the inner `syncTheme` callback could be inlined less, and the skill forbids single-line arrow functions / ternaries — this file already uses block syntax and early returns, so it complies. No change required.
