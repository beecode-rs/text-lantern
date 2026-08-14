# config

- **Path:** `src/main/util/config.ts`
- **Layer:** Util
- **Process:** main
- **Lines:** 21

## What this file is for

Loads environment variables (from `./.msh` and `./.msh-user` via `dotenv`) and resolves a small typed config object — `appRoot`, `logLevel`, `nodeEnv` — using `@beecode/msh-env`. Exposes it as a `config()` singleton via `singletonPattern`. It is the main process's env/plumbing accessor and owns no business rules.

## Layer & placement assessment
- **Right layer?** Yes — env loading + typed config accessor is dependency-light plumbing; `util/` is exactly where it belongs.
- **Right process boundary?** Yes — imports only third-party packages (`dotenv`, `@beecode/msh-env`, `@beecode/msh-logger`, `@beecode/msh-util`); no Electron/React/IPC surface touched.
- **Dependency direction ok?** Yes in isolation (util → third-party only, nothing upward). However the file currently has **zero importers** across `src/` — `config()` is never called anywhere, so the dependency edge from the rest of the app doesn't exist yet.
- **Folder naming (singular rule):** OK — lives under singular `util/`.
- **File naming:** OK — `config.ts` is kebab-case (single word); not a service singleton so no `-service` suffix applies.

## Notes / concerns
- **Dead code:** `grep` across `src/` finds no consumer of `config` (nor of `mshEnv`/`mshEnvResolver`/`dotenv` outside this file). Either wire it into the services that need `appRoot`/`logLevel`/`nodeEnv`, or remove it. As-is it is an orphaned, unused module.
- **Top-level side effects:** `setEnvLogger(...)` and both `dotenv.config(...)` calls run at import time. If the file is eventually wired in, those side effects execute merely by importing — worth confirming that's intended (it likely is, for the msh logger), but it makes the module non-pure.
- Minor nit: `appRoot`, `logLevel`, `nodeEnv` are resolved but `setEnvLogger` hard-codes `LogLevel.INFO`, ignoring the `logLevel` env value. If this ever gets used, thread `config().logLevel` into the logger preset instead.
