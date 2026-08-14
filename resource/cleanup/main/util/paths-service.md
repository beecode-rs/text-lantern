# paths-service

- **Path:** `src/main/util/paths-service.ts`
- **Layer:** Util
- **Process:** main
- **Lines:** 32

## What this file is for
This file is a singleton helper (`pathsService`) that resolves the filesystem locations the app needs at runtime: the project root, the `models/` and `bin/venv/` directories, the Piper binary / venv python / server-script paths, and per-user data files under Electron's `userData`. It centralizes all `path.join` plumbing so the services (`tts`, `models`, `history`, `settings`, `piper-server`) and the composition root never hardcode these paths themselves. It owns no business rules and holds no state.

## Layer & placement assessment
- **Right layer?** Yes — it is stateless path/plumbing logic with no business rules, exactly what the util layer is for, and the architecture doc explicitly lists `paths-service` under `util/`.
- **Right process boundary?** Yes — it imports only `node:path` and Electron's `app` (a main-process API), and lives in `src/main/`. No renderer/preload/shared leak.
- **Dependency direction ok?** Yes — it imports nothing from `service` or `controller`; it is consumed downward by the composition root (`index.ts`) and five services. No upward or circular imports.
- **Folder naming (singular rule):** OK — `util` is singular.
- **File naming:** NOTE — kebab-case is correct, but the `-service` suffix convention is reserved for service-layer singletons (architecture rule 5). As a util helper it would more cleanly read `paths.ts` exporting `pathsUtil`. The architecture doc does enumerate it as `paths-service` in `util/`, so this is an accepted project convention rather than a hard violation.

## Notes / concerns
- The single Electron dependency (`app.getPath('userData')`) makes the file marginally less "dependency-free" than a pure util, but it is minimal main-process plumbing and is acceptable here.
- Minor naming nit only (see File naming): if the project ever aligns util-layer naming with writing-clean-ts, rename to `paths.ts` / `pathsUtil` and update the six import sites.
