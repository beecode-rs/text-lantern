# tray-icon-image

- **Path:** `src/main/util/tray-icon-image.ts`
- **Layer:** Util
- **Process:** main
- **Lines:** 148

## What this file is for
Procedurally generates Text Lantern's menu-bar tray icon as an Electron `NativeImage`. It rasterizes a parametric "speech bubble + tail + sound waves" mark into a 28×20 RGBA buffer, produces both an outline and a filled variant, memoizes the pair, and exposes them via `trayIconImageUtil.outlineIcon()` / `filledIcon()`. The sole consumer is `tray-service.ts`, which puts the result into the native tray/menu.

## Layer & placement assessment
- **Right layer?** Yes — the architecture doc explicitly lists `tray-icon-image` under the Util layer (low-level, dependency-light plumbing with no business rules).
- **Right process boundary?** Yes — imports only `nativeImage` / `NativeImage` from `electron` (a main-process API) and lives under `src/main/`.
- **Dependency direction ok?** Yes — imported solely by `src/main/business/service/tray-service.ts`, i.e. service → util, the permitted direction. No upward or circular imports.
- **Folder naming (singular rule):** OK — lives under singular `util/`.
- **File naming:** OK — `kebab-case`, `.ts` with no JSX, and a `trayIconImageUtil` singleton object export. No `-service` suffix is expected since this is a util, not a service.

## Notes / concerns
- Placement is unambiguous and correct; nothing here belongs in `service/` or elsewhere.
- Style-only nits (not layer issues): the leading-underscore private helpers (`_isPixelInsideSpeechBubble`, etc.) and the `let`+conditional-reassignment pattern in `_isPixelInsideSpeechBubble`/`_renderPixelGridToImage` (which also uses `Array.from` for side effects on a `Buffer`) diverge from the writing-clean-ts conventions (prefer pure `.map()`, no exported-instance-style mutations). Worth a cleanup pass if/when this file is touched, but it does not affect its architectural placement.
