# suggestion-move — file placement plan to uphold `writing-clean-ts`

**Scope:** every TypeScript file under `src/` (48 files).
**Source of truth:** the per-file audit in this folder (`SUMMARY.md`, `_ARCHITECTURE.md`, the mirrored `.md` reports) measured against the `writing-clean-ts` skill.
**Verdict up front:** the codebase is already well-layered. **1 file genuinely needs to move.** Everything else is either correct as-is, or a *convention* decision (singular folders, kebab-case names) rather than an architecture problem.

---

## 1. Governing principle

`writing-clean-ts` assumes a single `src/` tree with this allowed top-level set:
`app-boot/`, `controller/`, `business/` (`component` / `service` / `repo` / `use-case` / `model`),
`dal/`, `ui-component/`, `util/`, `lib/`.

Electron **requires** process separation (`main` / `preload` / `renderer` / `shared`) for bundling
and security contexts — that boundary cannot be flattened. So the correct reading is:

> **Each Electron process is its own `writing-clean-ts` application.** The process folder is that
> process's `src/` root; the clean-architecture layers apply *within* each process. `shared/` is the
> cross-process contract (the one place all processes meet).

The `main` process already follows this almost perfectly. The renderer uses React/Electron idioms
that diverge on **naming**, not on **layering**.

### Layer map — clean-ts layer ↔ where it lives per process

| clean-ts layer | `main` | `renderer` | `preload` | `shared` |
|---|---|---|---|---|
| `app-boot/` (composition root) | `index.ts` | `App.tsx`, `main.tsx` | — | — |
| `controller/` | `controller/ipc-service.ts` (ipc = transport) | *(none — no router)* | `index.ts` (contextBridge) | — |
| `business/service/` | `business/service/*` | — | — | — |
| `business/model/` (DTOs/types) | — | — | — | `types.ts`, `languages.ts` |
| `ui-component/` | — | `components/**` | — | — |
| `util/` | `util/*` | `lib/*` ⚠️ | — | — |
| `lib/` (reusable infra) | — | — | — | — |

Legend: ⚠️ = a naming/semantic mismatch to decide on, not a broken layer.

---

## 2. The one genuine move (do this)

### `main/util/lang-service.ts` → `main/business/service/lang-service.ts`

**Why:** `resolveVoice()` reads `settings.languageBindings`, applies an auto-detect →
`fallbackLang` → first-binding rule, and returns a domain voice id over the `Settings` DTO. That is
**service-tier business logic**, which `_ARCHITECTURE.md`'s own Util definition ("no business rules")
excludes. The file is already named `-service` and exports a `langService` singleton — the name and
the folder currently contradict each other. Both consumers (`tts-service`, `models-service`) are
already services, so this turns a downward `service → util` call into a clean peer `service → service` call.

**Optional refinement** (only if you want a hard split): leave the pure helpers behind as
`main/util/lang.ts` (`detectLang`, `voiceLang` — both dependency-light and pure), and move only the
business rule (`resolveVoice`) up to `main/business/service/lang-service.ts`.

> This is the single file `SUMMARY.md` flags as ❌ off-layer. Everything below is a *decision*, not a defect.

---

## 3. Convention decisions (need a human call)

clean-ts and the project `CLAUDE.md` mandate rules that the React renderer currently breaks by
*convention*, not by accident. Each is a rename pass — pick a stance per item.

### Decision A — singular folder names (CLAUDE.md rule)

`CLAUDE.md` mandates singular folders. `main` already complies (`service`, `controller`, `util`,
`store`, `lib`). The renderer does not:

| Current (plural) | Suggested (singular) | Files touched |
|---|---|---|
| `renderer/src/components/` | `renderer/src/component/` | 2 (`NowPlaying`, `Sidebar`) |
| `renderer/src/components/settings/` | `renderer/src/component/settings/` | 7 |
| `renderer/src/components/ui/` | `renderer/src/component/ui/` (or `component/primitive/`) | 8 |

**Recommendation:** rename. This aligns the renderer with both the project rule and the rest of the
codebase. `component/` matches the short-singular style `main` already uses; clean-ts's canonical name
is `ui-component/` if you'd rather adopt the skill's exact vocabulary. `SUMMARY.md` rightly notes the
trade-off: `components/` is near-universal React convention, so this is a deliberate choice to favor
the house rule. **If you prefer to keep React convention, instead record an explicit renderer
exception in `CLAUDE.md`** — don't leave the rule and the code silently disagreeing.

### Decision B — kebab-case component filenames (clean-ts rule)

clean-ts specifies `kebab-case.tsx` for UI components. The renderer uses PascalCase:

| Current | Suggested |
|---|---|
| `component/NowPlaying.tsx` | `component/now-playing.tsx` |
| `component/Sidebar.tsx` | `component/sidebar.tsx` |
| `component/settings/About.tsx` … `Test.tsx` | `about.tsx` … `test.tsx` |
| `component/ui/Select.tsx`, `Slider.tsx`, … | `select.tsx`, `slider.tsx`, … |

**Recommendation:** rename the feature + UI components to kebab-case to comply. **Leave `App.tsx` and
`main.tsx` as-is** — these are bundler/React entry filenames recognized by convention; renaming them
buys little and surprises readers.

> Decisions A and B touch the same files, so do them in **one pass** (move + rename together) rather
> than twice. Every importer under `renderer/src/` will need its import paths updated.

### Decision C — renderer `lib/` vs `util/`

clean-ts defines `util/` as *"project-local pure helpers"* and `lib/` as *"reusable infrastructure
with no business logic, destined for a shared package."* The renderer `lib/` holds `accelerator`,
`format`, `stream-player`, `use-theme` — these are **project-local renderer helpers**, i.e. the
clean-ts `util/` definition, not `lib/`.

| Current | Option 1 (align) | Option 2 (document) |
|---|---|---|
| `renderer/src/lib/` | `renderer/src/util/` (matches `main/util/` + clean-ts) | keep `lib/`, note it as the renderer's helper layer in `CLAUDE.md` |

**Recommendation:** rename `lib/` → `util/`. Cross-process consistency (`main/util/` *and*
`renderer/src/util/`) makes the layer vocabulary identical everywhere, which is the whole point of a
layered standard. This is low-risk: the folder has no external import surface.

---

## 4. Full placement table (current → suggested)

`KEEP` = already correct. `MOVE` = genuine relocation. `RENAME` = Decision A/B/C.
Main-process services abbreviated `…` = `main/business/service/`.

### `main` (16 files) — essentially done

| Current | Suggested | Action |
|---|---|---|
| `main/index.ts` | — | KEEP (composition root ≈ `app-boot/`) |
| `main/controller/ipc-service.ts` | — | KEEP (controller; ipc is main's transport) |
| `main/business/service/history-service.ts` | — | KEEP |
| `main/business/service/models-service.ts` | — | KEEP |
| `main/business/service/piper-server-service.ts` | — | KEEP |
| `main/business/service/selection-service.ts` | — | KEEP |
| `main/business/service/settings-service.ts` | — | KEEP |
| `main/business/service/shortcuts-service.ts` | — | KEEP |
| `main/business/service/text-service.ts` | — | KEEP (stateless, but defensible as a service) |
| `main/business/service/tray-service.ts` | — | KEEP (documented Electron-tray exception) |
| `main/business/service/tts-service.ts` | — | KEEP |
| `main/util/lang-service.ts` | `main/business/service/lang-service.ts` | **MOVE** (§2) |
| `main/util/config.ts` | — | KEEP |
| `main/util/constants.ts` | — | KEEP |
| `main/util/paths-service.ts` | `main/util/paths.ts` *(optional)* | KEEP / naming nit: drops misleading `-service` suffix from a util |
| `main/util/tray-icon-image.ts` | — | KEEP |

### `preload` (1 file) — done

| Current | Suggested | Action |
|---|---|---|
| `preload/index.ts` | — | KEEP — Electron-mandated security bridge (`contextBridge`); conceptually a controller but must live in its own process |

### `shared` (2 files) — done

| Current | Suggested | Action |
|---|---|---|
| `shared/types.ts` | — *(optional `shared/model/types.ts`)* | KEEP — the cross-process contract ≈ clean-ts `business/model/` |
| `shared/languages.ts` | — *(optional `shared/data/languages.ts`)* | KEEP — cross-process data |

> `shared/` must remain importable by all four processes, so its DTOs cannot move into any single
> process's `business/model/`. It *is* the cross-process model layer. Grouping under `shared/model/`
> + `shared/data/` is optional polish, not required.

### `renderer` (29 files) — apply Decisions A/B/C

| Current | Suggested | Action |
|---|---|---|
| `renderer/src/api.ts` | — | KEEP (typed IPC bridge accessor; ≈ util) |
| `renderer/src/App.tsx` | — | KEEP (composition root; leave name) |
| `renderer/src/main.tsx` | — | KEEP (entry; leave name) |
| `renderer/src/vite-env.d.ts` | — | KEEP (ambient) |
| `renderer/src/components/NowPlaying.tsx` | `component/now-playing.tsx` | RENAME (A+B) |
| `renderer/src/components/Sidebar.tsx` | `component/sidebar.tsx` | RENAME (A+B) |
| `renderer/src/components/settings/*.tsx` (7) | `component/settings/*.tsx` (kebab) | RENAME (A+B) |
| `renderer/src/components/ui/*.tsx` (8) | `component/ui/*.tsx` (kebab) | RENAME (A+B) |
| `renderer/src/lib/*` (4: accelerator, format, stream-player, use-theme) | `util/*` | RENAME (C) |
| `renderer/src/store/*.ts` (4: history, models, settings, test) | — | KEEP |

> **On `store/`:** clean-ts has no `store/` layer. Zustand stores are the renderer's client-side state
> services — correctly renderer-local. Keep them under `store/`. The one caveat (already noted in
> `store/settings.md`): if a store grows IPC orchestration (validation, retries, default-merging),
> lift that into a `util/` helper rather than letting it accrete in the store.

---

## 5. What is already correct (leave untouched)

To be explicit about the 47/48 that *don't* need attention — this is the bulk of the codebase:

- **All process boundaries are clean.** No `ipcMain` outside `main/controller/`, no `ipcRenderer`
  outside `preload/`, no React in `main`, no Node in `renderer`, `shared/` imports nothing
  process-specific.
- **All dependency directions are one-way.** `controller → service → util → shared`; renderer
  `component → (store | util | ui)`, never reverse. No circular edges.
- **The 9 main services, the IPC controller, the composition root, preload, both shared files, the 4
  renderer stores, the 4 renderer helpers, the framework entries, and all 17 renderer components** are
  in their correct *layer*. The only open questions for the renderer are *naming* (Decisions A–C).

---

## 6. Suggested execution order

1. **`lang-service` move** (§2) — standalone, zero renderer impact. Update the two importers
   (`tts-service`, `models-service`). Verify with `pnpm typecheck`.
2. **Renderer rename pass** (Decisions A + B together) — move `components/` → `component/` **and**
   kebab-case the component filenames in one step; fix imports across `renderer/src/`.
3. **Renderer `lib/` → `util/`** (Decision C) — separate small pass; fix the handful of importers.
4. **(Optional) tidy:** drop the `-service` suffix from `main/util/paths-service.ts` → `paths.ts`;
   decide whether to group `shared/` into `model/` + `data/`.
5. **Record the convention outcome in `CLAUDE.md`** — whichever way you resolve A/B/C, write it down
   so the rule and the code stop disagreeing.

Each step is independently verifiable with `pnpm typecheck` (node + web) before moving on.
