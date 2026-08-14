# text-service

- **Path:** `src/main/business/service/text-service.ts`
- **Layer:** Service
- **Process:** main
- **Lines:** 97

## What this file is for
A pure, stateless text-cleaning service used to prepare selected text before it is sent to Piper TTS. Its single method `cleanText({ input, stripBrackets })` runs the input through a fixed pipeline of regex steps: strip code blocks/inline code, images, markdown links, HTML tags, emails, URLs, citations, list markers, optionally bracket content, then collapse decoration characters and tidy whitespace. The step order and what gets stripped are product decisions (what should be spoken vs. ignored), so this is domain logic rather than generic plumbing. The file exports one singleton object `textService`; the individual step functions are module-private.

## Layer & placement assessment
- **Right layer?** Yes (defensibly). It has no Electron/native deps and no state, which would also fit `util/`, but the choice of what to strip for TTS is a product rule, so `business/service/` is an acceptable home.
- **Right process boundary?** Yes. No `electron`, `ipcMain`, `ipcRenderer`, React, or `window` imports — pure TypeScript.
- **Dependency direction ok?** Yes. The file imports nothing from the project; the only consumer is `tts-service.ts` (service → service), which is correct.
- **Folder naming (singular rule):** OK — lives under singular `service/`.
- **File naming:** OK — `text-service.ts` is kebab-case with the `-service` suffix and `.ts` (no JSX).

## Notes / concerns
- Module-level helper functions (`stripCodeBlocks`, `stripUrls`, …) are file-private, which is fine; only `textService` is exported, satisfying the "group into a singleton, no multiple standalone exports" rule.
- `cleanText` correctly uses object params and a block-body `.reduce` with an explicit `return` — matches the writing-clean-ts style.
- Minor naming nit: the file/models elsewhere refer to "text", but the responsibility is specifically *TTS pre-cleaning*. If other text concerns ever appear, consider renaming to `tts-text-service` or moving the pipeline under a `text/` subfolder to keep the single responsibility explicit. Not actionable today.
