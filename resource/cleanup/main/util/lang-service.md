# lang-service

- **Path:** `src/main/util/lang-service.ts`
- **Layer:** Util (declared) — but contains Service-tier business logic
- **Process:** main
- **Lines:** 63

## What this file is for
Exports `langService`, a singleton with three methods. `detectLang` wraps `tinyld` to recognize a supported Piper language code from raw text; `voiceLang` parses a language code out of a Piper voice-name prefix (e.g. `sr_Marko_medium` → `sr`); `resolveVoice` is the speak-request voice resolver — given a `Lang` (or `'auto'`), the text, and the user's `Settings`, it picks the matching binding's voice, falling through auto-detection, the `fallbackLang` binding, and finally the first binding. It is consumed by `tts-service` and `models-service`.

## Layer & placement assessment
- **Right layer?** No (mixed). The architecture doc declares `lang-service` a Util, and `detectLang`/`voiceLang` genuinely are dependency-light pure helpers — but `resolveVoice` reads `settings.languageBindings`, applies an auto-detect-then-`fallbackLang`-then-first rule and returns a domain voice id. That is a business rule over a domain DTO (`Settings`), which the doc's own Util definition ("no business rules") excludes. The file is named `-service` and exports a `langService` singleton, both of which signal Service, not Util.
- **Right process boundary?** Yes. Imports only `tinyld` and `@src/shared/*` (languages + types); no Electron/React/IPC surface. Stays correctly inside main.
- **Dependency direction ok?** Yes. Both callers (`tts-service`, `models-service`) sit in the Service layer and import downward into Util; `shared` is imported by everyone. No upward or circular edges.
- **Folder naming (singular rule):** OK — lives under singular `util/`.
- **File naming:** NOTE — `kebab-case` + `-service` suffix + `camelCase` singleton is correct *for a Service*, which is inconsistent with its Util placement (the util siblings `config`, `constants`, `tray-icon-image` carry no `-service` suffix; `paths-service` is the only other exception). Either the file or the folder is mislabeled.

## Notes / concerns
- Placement recommendation: move `langService` (or at least `resolveVoice`) to `src/main/business/service/lang-service.ts`. Both consumers are already services, so this turns a service→util call into a peer service→service call and removes the "util with business rules" contradiction. `detectLang`/`voiceLang` could stay behind in `util/` as a pure `lang-util.ts` if you want a clean split.
- Clean-TS nits in the body (mandated standard): the two JSDoc blocks violate the "zero comments" rule — `resolveVoice`/`voiceLang` are descriptive enough to stand on their own, or the why should move into a renamed helper; and the `params.lang === 'auto' ? ... : ...` ternary on line 31 violates the no-ternary rule and should become an `if/else`. Also, `resolveVoice` calls `this.detectLang`, which per the skill's class-vs-object guidance ("class when methods call each other via `this`") leans toward a `class LangService` rather than a singleton object literal.
