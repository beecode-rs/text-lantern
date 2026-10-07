# Development setup

Everything you need to work on Text Lantern itself: prerequisites, daily
commands, project layout, environment variables, and the tech stack. For using
the app, start with the [README](../../README.md).

## Prerequisites

- **Node.js** `^20.19 || >=22.12` (Node 22 LTS recommended) — required to run
  the dev server and build. `electron-vite` uses Vite 7, which needs this Node
  range. Older Node (e.g. 18) fails to start the dev server with
  `TypeError: crypto.hash is not a function`. The project pins this via an
  `.nvmrc`; with [fnm](https://github.com/Schniz/fnm) or
  [nvm](https://github.com/nvm-sh/nvm), switch to it before installing:

  ```bash
  fnm use            # or: nvm use   (reads .nvmrc → Node 22)
  fnm install 22     # one-time, if you don't already have Node 22
  ```

- **pnpm** (`pnpm-lock.yaml`; `packageManager` pinned to `pnpm@10.23.0`) —
  install via [Corepack](https://nodejs.org/api/corepack.html)
  (`corepack enable`) or [standalone](https://pnpm.io/installation). **npm and
  yarn are blocked** by a `preinstall` guard; always use `pnpm install`.

- **python3** 3.9+ — only for the Piper engine, which the app installs into its
  private virtualenv when you click **Install engine** in the Models section
  (also during development). On Debian/Ubuntu, if the engine install fails,
  install the headers (`sudo apt install python3-venv espeak-ng-dev`) and retry
  from the Models section. On Windows, install Python from python.org with
  "Add python.exe to PATH" checked. The Kokoro engine needs no Python at all.

## Daily commands

```bash
git clone https://github.com/beecode-rs/text-lantern.git
cd text-lantern
nvm use                                  # switch to Node 22 (pinned in .nvmrc)
pnpm install                             # installs deps + downloads the Electron binary
pnpm dev                                 # launch with hot reload
```

> The Electron binary downloads automatically during `pnpm install` (the
> `postinstall` script runs Electron's installer explicitly). If `pnpm install`
> was ever run on an older Node and you see `Error: Electron uninstall`,
> re-run it on Node 22, or fetch the binary directly:
> `node node_modules/electron/install.js`.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Launch with hot reload (`electron-vite dev`) |
| `pnpm build` | Build main/preload/renderer into `out/` |
| `pnpm start` / `pnpm preview` | Run the built app |
| `pnpm typecheck` | Typecheck the node and web projects |
| `pnpm lint` / `pnpm lint-fix` | ESLint + Prettier + json-sort-cli (check / fix) |
| `pnpm dist:mac` | Build the universal macOS dmg into `dist/` |
| `pnpm dist:linux` | Build the Linux AppImage + deb into `dist/` |
| `pnpm dist:win` | Build the Windows NSIS exe into `dist/` |
| `pnpm pack:dir` | Unpacked build into `dist/` for a quick local smoke test |
| `pnpm release:patch` / `release:minor` / `release:major` | Bump version, tag, push — see [releasing.md](releasing.md) |
| `pnpm clean-app-cache` | Run `resource/script/clean-app-cache.cjs` to clear the app's userData cache |

## Project layout

```
text-lantern/
├── src/                # the Electron app (all logic lives here)
│   ├── main/           # Node main process: tts, models, ipc, settings, shortcuts, tray
│   ├── preload/        # contextBridge API
│   ├── renderer/       # React + Tailwind UI
│   └── shared/         # types shared across processes
├── build/              # electron-builder icons (regenerate: resource/script/generate-build-icons.cjs)
├── resource/           # app icon, piper server script, reference material
├── vendor/             # sharp stub packed into the app (see electron-builder.yml)
├── models/             # voices (*.onnx + *.onnx.json) and the Kokoro model (dev only, app-managed)
└── bin/venv/           # piper-tts engine (dev only, created by the app)
```

In an installed app, `models/` and `bin/venv/` live under the OS userData folder
(`~/Library/Application Support/Text Lantern` on macOS) — never inside the
installation, so they survive updates.

## Environment variables

### `languages`

Extends the list of **recognized languages** shown in the UI. The value is a
JSON array of `{ code, name }` objects:

```json
[
  {"code": "hr", "name": "Croatian"},
  {"code": "sl", "name": "Slovenian"},
  {"code": "en", "name": "American English"}
]
```

- **Existing code** → its display **name is overridden** (above, `en` becomes
  "American English"); the code is not duplicated and keeps its position.
- **New code** → **appended** to the end of the list. Codes stay unique.
- Codes are **case-normalized to lowercase**; each entry needs a non-empty
  `code` and `name`, otherwise it is skipped.
- If `languages` is **unset or the JSON is invalid**, the built-in list is used
  unchanged (invalid JSON also logs a warning to the console).

Set it inline before launching, or `export` it in your shell:

```bash
languages='[{"code":"hr","name":"Croatian"}]' pnpm dev
```

The variable is read when the app launches, so for a packaged build set
`languages` in the process environment the same way.

> **Note:** listing a language does **not** install a voice. Whether a Piper
> voice exists for a code is resolved at runtime from installed/downloaded
> voices (the Models section). Add `{"code":"hr","name":"Croatian"}` and
> Croatian appears in the list, but you still need to download a Croatian voice
> for it to speak.

See [features.md](features.md) for how language bindings, voices, and
auto-detect work together.

## Tech stack

- **Electron** + **electron-vite** (Vite 7) — app shell and build tooling
- **TypeScript** throughout; React 18 + **Tailwind CSS 4** + zustand in the
  renderer
- **TTS engines**: `piper-tts` (Python, GPL-3.0, app-managed virtualenv) and
  `kokoro-js` (JavaScript, Apache-2.0)
- **tinyld** for language detection
- [@beecode/msh-*](https://github.com/beecode-rs) packages for app boot, env,
  logging, and utils
- ESLint + Prettier + json-sort-cli for quality gates
