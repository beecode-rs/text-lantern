# accelerator

- **Path:** `src/renderer/src/lib/accelerator.ts`
- **Layer:** Lib
- **Process:** renderer
- **Lines:** 115

## What this file is for
Converts a DOM `KeyboardEvent` into an Electron accelerator string (e.g. `Command+Shift+S`) for the shortcut-capture UI. It normalizes `KeyboardEvent.code`/`key` into Electron's modifier+key grammar, ignores bare modifier presses, and returns either `{ accel }`, `{ cancel: true }` (on Escape), or `null` (still composing). Exported as a singleton `acceleratorService` consumed by `ShortcutInput`.

## Layer & placement assessment
- **Right layer?** Yes — pure, stateless renderer helper with no JSX, exactly what `lib/` is for.
- **Right process boundary?** Yes — operates only on the DOM `KeyboardEvent` type; no `window`, IPC, React, or Electron main API touched here.
- **Dependency direction ok?** Yes — the file imports nothing; its only consumer is `components/ui/ShortcutInput.tsx` (component → lib), which is the correct downward direction.
- **Folder naming (singular rule):** OK — lives under singular `lib/`.
- **File naming:** NOTE — kebab-case is correct, and `acceleratorService` follows the singleton export convention; the basename lacks a `-service` suffix, but the `-service` rule is intended for `business/service/` singletons, so `lib/accelerator.ts` is acceptable as-is.

## Notes / concerns
- The Electron accelerator *grammar* (modifier/key names) is conceptually shared with the main process (which registers global shortcuts), but this file's input is the renderer-only `KeyboardEvent`, so renderer placement is correct. If the raw grammar mapping (`CODE_TO_KEY`, modifier names) is ever needed in main, it would be a candidate for `src/shared/` — not the case today.
