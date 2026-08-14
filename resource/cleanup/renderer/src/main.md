# main.tsx

- **Path:** `src/renderer/src/main.tsx`
- **Layer:** Composition root
- **Process:** renderer
- **Lines:** 10

## What this file is for
This is the renderer process entry point — the Vite HTML file (`src/renderer/index.html`) loads it. It locates the `#root` DOM node, mounts the root `<App />` component with `createRoot().render()`, and pulls in the global `theme.css`. It owns React bootstrap and nothing else: no business rules, no IPC, no state.

## Layer & placement assessment
- **Right layer?** Yes — this is the renderer's composition root (React root), exactly where the architecture places `main.tsx` alongside `App.tsx`.
- **Right process boundary?** Yes — only `react-dom/client` and `document` are touched; both are renderer-only. No Electron `ipcRenderer`, no main/preload modules leak in.
- **Dependency direction ok?** Yes — imports flow downward into the `App` component and a stylesheet; the only consumer is the HTML entry. No upward or circular import.
- **Folder naming (singular rule):** OK for this file — it sits directly under `src/renderer/src/` (no plural parent). Note: the sibling `styles/` folder it imports is plural and violates the rule, but that is a separate cleanup, not a placement issue for `main.tsx`.
- **File naming:** OK — `main.tsx` is the conventional Vite entry name and the file does export JSX (`<App />`), so the `.tsx` extension is correct.

## Notes / concerns
- The `@src/renderer/src/styles/theme.css` import references the plural `styles/` folder; renaming it to `style/` (singular) is the CLAUDE.md violation to address, independent of this file.
- Minor: imports use the `@src/...` alias where renderer-relative paths (`./App`, `./styles/theme.css`) would also work; either is consistent with the project's alias convention, so no change required.
