# Text Lantern — file-by-file cleanup audit

**Scope:** every TypeScript file under `src/` — **48 files**, one `.md` report each, mirrored
to this folder (e.g. `src/main/business/service/tts-service.ts` →
`main/business/service/tts-service.md`).

**Method:** one subagent per file. Each loaded the `writing-clean-ts` skill, read
`_ARCHITECTURE.md` (the project's process boundaries, layers, and rules), then judged the
file on process boundary, layer placement, dependency direction, the CLAUDE.md
singular-folder rule, and naming. See `_ARCHITECTURE.md` for the ruleset.

---

## Headline findings

### 1. Layering is clean — with one exception

**47 / 48 files are in the right layer.** The only genuine layer concern:

- **`src/main/util/lang-service.ts`** — declared a `Util`, but it owns language-detection
  *business logic* (the `auto`-detect rules that pick a binding's voice). Per the ruleset
  that's Service-tier logic living in the Util layer. Candidates: promote to
  `main/business/service/lang-service.ts`, or keep in `util/` if you consider language
  detection pure plumbing (the report spells out the trade-off).

Minor notes (still "Yes", worth a glance):
- `src/main/business/service/text-service.ts` — stateless, no Electron deps; defensible as
  a service but could also live as pure logic. No action required.

### 2. Folder naming — 17 renderer files violate the singular-folder rule

CLAUDE.md mandates **singular folder names**. The Electron/main side (`service`,
`controller`, `util`, `store`, `lib`) all comply. But the React renderer uses conventional
plural folders, which the rule flags as violations:

- **`components/`** (2), **`components/settings/`** (7), **`components/ui/`** (8) → 17 files.

This is a **convention conflict, not a bug**: `components/` is near-universal React
convention, so renaming to `component/` would fight the ecosystem. Worth an explicit
decision: either (a) rename the renderer folders to singular to match the project rule, or
(b) carve out an exception for the renderer in CLAUDE.md. Every report records this as
`VIOLATION` against the literal rule.

> Process boundaries and dependency direction are clean across the board — no file imports
> across a forbidden boundary (no `ipcMain` outside `controller/`, no `ipcRenderer` outside
> `preload/`, `shared/` stays process-agnostic).

---

## Index by layer

Legend — verdict is the layer-placement call: ✅ right layer · ⚠️ nuance · ❌ off-layer.
Folder column only flags the singular-rule violations.

### Main process — `src/main/`

#### Service layer (`business/service/`) — 9 files
| File | Verdict | Folder |
|---|---|---|
| `history-service.ts` | ✅ | OK |
| `models-service.ts` | ✅ | OK |
| `piper-server-service.ts` | ✅ | OK |
| `selection-service.ts` | ✅ | OK |
| `settings-service.ts` | ✅ | OK |
| `shortcuts-service.ts` | ✅ | OK |
| `text-service.ts` | ⚠️ stateless, defensible | OK |
| `tray-service.ts` | ✅ (intentional Electron-tray wrapper) | OK |
| `tts-service.ts` | ✅ | OK |

#### Controller layer (`controller/`) — 1 file
| File | Verdict | Folder |
|---|---|---|
| `ipc-service.ts` | ✅ | OK |

#### Composition root — 1 file
| File | Verdict | Folder |
|---|---|---|
| `index.ts` | ✅ | OK |

#### Util layer (`util/`) — 5 files
| File | Verdict | Folder |
|---|---|---|
| `config.ts` | ✅ | OK |
| `constants.ts` | ✅ | OK |
| `lang-service.ts` | ❌ Service-tier logic in Util | OK |
| `paths-service.ts` | ✅ | OK |
| `tray-icon-image.ts` | ✅ | OK |

### Preload — `src/preload/` — 1 file
| File | Verdict | Folder |
|---|---|---|
| `index.ts` | ✅ | OK |

### Shared — `src/shared/` — 2 files
| File | Verdict | Folder |
|---|---|---|
| `languages.ts` | ✅ | OK |
| `types.ts` | ✅ | OK |

### Renderer — `src/renderer/src/`

#### Root + API — 4 files
| File | Layer | Verdict | Folder |
|---|---|---|---|
| `api.ts` | Lib (IPC bridge) | ✅ | OK |
| `App.tsx` | Composition root | ✅ | OK |
| `main.tsx` | Composition root | ✅ | OK |
| `vite-env.d.ts` | Ambient | ✅ | OK |

#### Feature components (`components/`) — 2 files
| File | Verdict | Folder |
|---|---|---|
| `NowPlaying.tsx` | ✅ | ⚠️ `components/` plural |
| `Sidebar.tsx` | ✅ | ⚠️ `components/` plural |

#### Settings screens (`components/settings/`) — 7 files
| File | Verdict | Folder |
|---|---|---|
| `About.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `DownloadModels.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `General.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `History.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `Languages.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `Models.tsx` | ✅ | ⚠️ `components/settings/` plural |
| `Test.tsx` | ✅ | ⚠️ `components/settings/` plural |

#### UI primitives (`components/ui/`) — 8 files
| File | Verdict | Folder |
|---|---|---|
| `ModelCard.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `RemoteModelRow.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `Select.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `SettingsGroup.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `ShortcutInput.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `Slider.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `StarBadge.tsx` | ✅ | ⚠️ `components/ui/` plural |
| `Toggle.tsx` | ✅ | ⚠️ `components/ui/` plural |

#### Lib (`lib/`) — 4 files
| File | Verdict | Folder |
|---|---|---|
| `accelerator.ts` | ✅ | OK |
| `format.ts` | ✅ | OK |
| `stream-player.ts` | ✅ | OK |
| `use-theme.ts` | ✅ | OK |

#### Store (`store/`) — 4 files
| File | Verdict | Folder |
|---|---|---|
| `history.ts` | ✅ | OK |
| `models.ts` | ✅ | OK |
| `settings.ts` | ✅ | OK |
| `test.ts` | ✅ | OK |

---

Open any report for the full "what this file is for" description and per-file notes.
