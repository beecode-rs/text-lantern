# constants

- **Path:** `src/main/util/constants.ts`
- **Layer:** Util
- **Process:** main
- **Lines:** 13

## What this file is for
Holds main-process-wide constants with no logic. Exports a bare `APP_NAME` string used by the composition root, the selection service, and the tray service, plus a `constant()` singleton accessor that lazily exposes a frozen `{ projectName, projectVersion }` pair read from the root `package.json`. It is pure plumbing — no business rules, no Electron/IPC coupling.

## Layer & placement assessment
- **Right layer?** Yes — the architecture doc names `constants` explicitly as a `util/` resident; this file is dependency-light, stateless cross-cutting data.
- **Right process boundary?** Yes — imports only `@beecode/msh-util/singleton/pattern` and `#packageJson` (root `package.json`, not process-specific); every importer is in `src/main/`.
- **Dependency direction ok?** Yes — util is the bottom of the `controller → service → util` chain; this file imports nothing upward or sideways, and is consumed by the composition root and two services, which is the correct flow.
- **Folder naming (singular rule):** OK — `util/` is singular.
- **File naming:** OK — `constants.ts` is `kebab-case`; no `-service` suffix is expected since this is not a service singleton.

## Notes / concerns
- The file mixes two export styles: a bare `export const APP_NAME = '...'` string alongside a `constant` singleton accessor. Folding `APP_NAME` into the `constant()` object (or, conversely, inlining the `projectName`/`projectVersion` access) would make the module's shape consistent. Minor.
- `constant` is a very generic name for the singleton accessor; `appConstant` would read more clearly at call sites. Minor naming nit.
- The `constant()` accessor is currently imported by no one (only `APP_NAME` is used) — if that remains true, the `projectName`/`projectVersion` exposure is speculative and could be trimmed.
