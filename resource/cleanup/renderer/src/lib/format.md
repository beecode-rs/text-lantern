# format

- **Path:** `src/renderer/src/lib/format.ts`
- **Layer:** Lib
- **Process:** renderer
- **Lines:** 81

## What this file is for
Pure renderer-side formatting helpers. It detects the host platform once via `navigator.platform` and exposes two formatters through a `formatService` singleton: `formatBytes` (turns a byte count into a human-readable `B/KB/MB/GB` string) and `formatAccelerator` (turns an Electron accelerator like `CommandOrControl+Shift+P` into a display glyph, e.g. `⌘⇧P` on macOS). It holds no state, no JSX, and no React/Node/Electron imports.

## Layer & placement assessment
- **Right layer?** Yes — `lib/` is defined as renderer-side helpers with no JSX, and the architecture doc itself lists `format` as a `lib/` sibling.
- **Right process boundary?** Yes — only touches the browser `navigator` API; no `ipcRenderer`, no Electron `main`/`preload`/`shared` imports.
- **Dependency direction ok?** Yes — the file imports nothing (pure leaf module); it is consumed only by `components/ui/` (`ModelCard`, `RemoteModelRow`, `ShortcutInput`), which is the correct `components → lib` direction.
- **Folder naming (singular rule):** OK — lives under singular `lib/`.
- **File naming:** NOTE — `format.ts` is kebab-case and matches the architecture doc's own `lib/` examples (`accelerator`, `format`, `stream-player`, `use-theme`), none of which carry a `-service` suffix. The export is however a `formatService` singleton, so there is a mild tension with the global "service singletons get a `-service` filename" rule. Renaming to `format-service.ts` would align with the global rule but break the established local `lib/` convention; either is defensible.

## Notes / concerns
- `bytesToDecimals` is declared after its only caller `formatBytes` (line 21 vs 10). Function hoisting makes this safe, but moving it above the caller would read better top-down.
- The `let joiner` + `if (isMac) { joiner = '' }` block is the correct no-ternary alternative per the TS skill; no change needed.
- Single-primitive params on `formatBytes`/`formatAccelerator` are acceptable here under the skill's utility-layer exception (name implies the parameter); no object-param conversion required.
