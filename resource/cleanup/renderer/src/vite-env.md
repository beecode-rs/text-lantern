# vite-env.d.ts

- **Path:** `src/renderer/src/vite-env.d.ts`
- **Layer:** Ambient
- **Process:** renderer
- **Lines:** 1

## What this file is for
Vite's standard ambient declaration boilerplate for the renderer. The `/// <reference types="vite/client" />` triple-slash directive pulls in Vite's client types, which is what gives `import.meta.env` its shape and — more importantly for this app — types static asset imports so `import iconUrl from '...assets/icon.png'` (used in `Sidebar.tsx` and `components/settings/About.tsx`) resolves to a string URL instead of a type error. Without it, every asset import in the renderer would fail to type-check.

## Layer & placement assessment
- **Right layer?** Yes — an ambient `.d.ts` at the renderer source root is exactly where Vite expects this reference; it has no runtime, no logic, and no layer to belong to beyond Ambient.
- **Right process boundary?** Yes — lives under `src/renderer/src/` and references only `vite/client`, which is a dev/build-time type package, not a main/preload/shared module.
- **Dependency direction ok?** Yes — it references nothing project-internal; it is a leaf that everything else implicitly consumes via the TS include scope.
- **Folder naming (singular rule):** OK — sits at the `src/renderer/src/` root; every ancestor folder (`src`, `renderer`, `src`) is singular.
- **File naming:** OK — `vite-env.d.ts` is Vite's prescribed filename; it is not a service/component, so no `-service` suffix or `.tsx` rule applies.

## Notes / concerns
- The file earns its keep only because of the `.png` asset imports in `Sidebar.tsx` and `About.tsx`; if those were ever removed, the reference would still be harmless Vite boilerplate but no longer load-bearing.
