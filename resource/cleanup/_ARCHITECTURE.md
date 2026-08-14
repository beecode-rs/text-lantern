# Text Lantern — Architecture reference (for cleanup analysis)

**Text Lantern** is an Electron app: a Handy-inspired menu-bar reader that speaks the
selected text with Piper TTS. Built with `electron-vite`, React 18 + Zustand on the
renderer, plain services on the main side.

Path alias: `@src/*` → `src/*`.

## Process boundaries (4)

### `src/main/` — Electron main process (Node + Electron)
- **`business/service/`** — **Service layer.** Singleton domain services that own the
  real logic + state: `history`, `models`, `piper-server`, `selection`, `settings`,
  `shortcuts`, `text`, `tray`, `tts`. A service holds business rules and is called by the
  controller / `index.ts`. Services should not know about the renderer or IPC channels
  (the one intentional exception is `tray-service`, which wraps the native tray/menu).
- **`controller/`** — **Controller layer.** `ipc-service` registers `ipcMain.handle`
  handlers and translates each renderer IPC call into a service call. It is the only place
  that should import both Electron's `ipcMain` and the services. This is the bridge
  renderer ↔ main.
- **`util/`** — **Util layer.** Low-level, mostly dependency-free helpers: `config`,
  `constants`, `paths-service`, `lang-service` (language detection), `tray-icon-image`.
  Cross-cutting plumbing, no business rules.
- **`index.ts`** — **Composition root / app lifecycle.** Wires services, creates the
  `BrowserWindow`, registers IPC, handles app events. The entry point — orchestrates,
  does not own business rules.

### `src/preload/` — Preload bridge
- `index.ts` securely exposes a typed `window.api: TtsApi` via `contextBridge`. It is the
  ONLY place that touches `ipcRenderer`. No logic — pure IPC forwarding.

### `src/renderer/src/` — Renderer (React + Zustand)
- **`components/`** — feature components (`NowPlaying`, `Sidebar`).
- **`components/settings/`** — settings tab screens.
- **`components/ui/`** — reusable presentational primitives (`Select`, `Slider`,
  `Toggle`, `ModelCard`, …). Dumb, composable.
- **`lib/`** — renderer-side helpers & hooks (`accelerator`, `format`, `stream-player`,
  `use-theme`). No JSX/component UI here.
- **`store/`** — Zustand state stores.
- **`api.ts`** — typed access to `window.api` (IPC bridge to main).
- **`App.tsx` / `main.tsx`** — React root.
- `vite-env.d.ts` — ambient type declarations.

### `src/shared/` — Shared (importable by ALL processes)
- **`types.ts`** — the single source of truth for the IPC contract (`TtsApi`) and all
  cross-process DTOs/interfaces. Pure types, no runtime.
- **`languages.ts`** — language metadata (data). No process-specific deps.

## Rules to judge every file against

1. **Process boundary correctness.** Electron `app`/`BrowserWindow`/`nativeImage` only in
   `main`; React/`window` only in `renderer`; `ipcRenderer` only in `preload`; `main`'s
   `ipcMain` only in `controller`; `shared` must not import any process-specific module.
2. **Layer correctness.** Logic lives in `service`; IPC wiring lives in `controller`; the
   composition root (`index.ts`) only orchestrates; `util` is dependency-light plumbing;
   renderer `lib` ≠ components, `store` ≠ `lib`.
3. **Dependency direction.** `controller` → `service` → `util` (one way). `shared` is
   imported by everyone, imports no one process-specific. Renderer `components` may use
   `lib`/`store`/`ui`; `lib`/`store` should not import components.
4. **Folder naming (CLAUDE.md project rule): folders must be SINGULAR.** Note the current
   tree: `service`, `controller`, `util`, `store`, `lib` are singular ✓; but `components`,
   `assets`, `styles`, `settings`, `ui` are PLURAL ✗ — flag these as rule violations.
5. **File naming (writing-clean-ts):** `kebab-case` with a `-service` suffix for service
   singletons (e.g. `tts-service.ts`); `.tsx` only for files exporting JSX.

## Output template (every `.md` you write must follow this)

````markdown
# <file basename>

- **Path:** `<repo-relative path>`
- **Layer:** <Util | Service | Controller | Composition root | Preload | Component | Settings UI | UI primitive | Lib | Store | Shared types | Shared data | Ambient>
- **Process:** <main | preload | renderer | shared>
- **Lines:** <n>

## What this file is for
<2–4 sentences: the responsibility this file owns and nothing else. Concrete, not generic.>

## Layer & placement assessment
- **Right layer?** <Yes / No — one line why.>
- **Right process boundary?** <Yes / No — flag any process-specific import that doesn't belong.>
- **Dependency direction ok?** <Yes / No — note any upward/circular import.>
- **Folder naming (singular rule):** <OK / VIOLATION — e.g. lives under plural `components`.>
- **File naming:** <OK / NOTE — e.g. missing `-service` suffix, `.tsx` without JSX.>

## Notes / concerns
<Optional bullets: anything that belongs elsewhere, duplication, naming nits, or a
recommendation. Keep it short. Omit the section if there is nothing material.>
````

Write the output to the **mirrored** path under `resource/cleanup/` — i.e. drop the
`src/` prefix. Example: `src/main/business/service/tts-service.ts` →
`resource/cleanup/main/business/service/tts-service.md`;
`src/renderer/src/App.tsx` → `resource/cleanup/renderer/src/App.md`.
