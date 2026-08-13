# Text Lantern — read selected text aloud (Serbian + English)

A Handy-inspired, **menu-bar** desktop app (Electron + TypeScript, React + Tailwind
renderer) that reads the currently-selected text aloud using
[Piper](https://github.com/rhasspy/piper) neural voices. It ships with a
**Serbian** voice ([phantom9623/piper-serbian-tts](https://huggingface.co/phantom9623/piper-serbian-tts),
`sr_Marko_medium`) and a natural **English** voice (`en_US-lessac-medium`), and you
can add any other Piper voice.

All of the app's logic — text cleaning, language detection, voice resolution,
voice download, engine install, and audio playback — lives in the TypeScript app.
The only external process is the Piper engine itself (the Python `piper-tts`
package), which the app installs and manages for you in a private virtualenv
under `bin/venv/`.

Both Cyrillic and Latin Serbian input are supported by the Serbian voice.

## Quick start

```bash
npm install
node node_modules/electron/install.js   # download the Electron binary (first time only)
npm run dev                              # launch with hot reload
# or
npm run build                            # production build into out/
```

On first launch, **Settings → Models** shows *Piper engine not found*. Click
**Install engine** — the app creates the virtualenv, installs `piper-tts`, and
downloads the default Serbian + English voices. (You only need `python3` 3.9+
on your machine; the app does the rest.)

## Features

- **Menu-bar tray** with a reading-state icon and a menu (Read auto, one entry per
  configured language, Stop, Settings, Quit).
- **Languages** (Settings → Languages): pair each language with the voice that reads
  it and a global shortcut — one row per language. Add any recognized language, pick
  its voice, and bind a hotkey; each language and each shortcut can be used only once,
  and conflicts are flagged. Auto-detect and Stop have their own shortcuts too.
- **Models** (Settings → Models): install the Piper engine, list installed voices, and
  download any Piper voice by name with a progress bar. Voices used by a language are
  marked "in use".
- **General**: speech speed, text-cleaning toggles, window prefs.
- A **Now Playing** bar shows synthesis/reading state with a Stop button.

## Selecting text

On macOS, reading the selection needs **Accessibility** permission for the app
(System Settings → Privacy & Security → Accessibility). The app sends a Cmd+C to
copy the selected text; the clipboard is saved and restored around the grab, so
your clipboard isn't disturbed.

## Voices & languages

The app ships with two language bindings:

| Language | Default voice | Source |
|----------|---------------|--------|
| Serbian (`sr`) | `sr_Marko_medium` | phantom9623/piper-serbian-tts |
| English (`en`) | `en_US-lessac-medium` | rhasspy/piper-voices |

In **Settings → Languages** each language is one row: choose the voice that reads it
and the global shortcut that triggers reading. Add any recognized language (the full
list lives in `src/shared/languages.ts`), then pair it with an installed voice. Each
language and each shortcut may be used only once.

**Auto-detect** (its own shortcut, and the tray's default action) detects the language
from the selected text and reads it with the matching binding's voice; when the
detected language has no binding, the first binding is used.

**Add more voices** (any from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices))
in Settings → Models, e.g. `en_US-ryan-high` (male), `en_US-amy-medium` (female),
`en_GB-cori-high` (British). Some natural English options: `en_US-lessac-medium`
(default), `en_US-ryan-high` (male), `en_US-amy-medium` (female),
`en_GB-cori-high` (British), `en_GB-alan-medium` (male, British).

### Adding custom languages (environment variable)

Extend the list of **recognized languages** shown in the UI via the `languages`
environment variable, whose value is a JSON array of `{ code, name }` objects.

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
languages='[{"code":"hr","name":"Croatian"}]' npm run dev
languages='[{"code":"hr","name":"Croatian"}]' npm run build
```

For a packaged build, set `languages` in the process environment the same way.

> **Note:** listing a language does **not** install a voice. Whether a Piper
> voice exists for a code is resolved at runtime from installed/downloaded
> voices (Settings → Models). Add `{"code":"hr","name":"Croatian"}` and Croatian
> appears in the list, but you still need to download a Croatian voice for it
> to speak.

### What the cleaner removes

Before speaking, the text is cleaned (toggle in Settings → General):

- URLs (`https://…`, `www.…`, `example.com/path`) and e-mail addresses
- Markdown: `[text](url)` → `text`, images `![…]()` gone, `**bold**`/`__u__`/`~~s~~`
  stripped, headings & list markers dropped
- Inline and fenced code blocks
- Citation / reference markers (`[1]`, `[12, p. 3]`, `[citation needed]`)
- HTML tags
- Bracket characters `()[]{}` — by default the inner text is kept; *Strip bracket
  content* deletes the content too
- Extra whitespace and space-before-punctuation

### Speed / prosody

Speech speed (General → Speech) is a reading-speed multiplier: `2.0` reads twice
as fast, `1.0` is normal, `0.5` half speed. It is inverted to Piper's
`--length-scale` (`1 / speed`) at the engine.

## Requirements

- **python3** 3.9+ — only for the Piper engine, which the app installs into `bin/venv/`.
  On Linux, if engine install fails, install the headers (`sudo apt install
  espeak-ng-dev`) and retry from Settings → Models.
- macOS (the UI uses macOS-native window chrome and selection grabbing).

Everything runs fully on-device; nothing is sent anywhere.

## Project layout

```
tts-script/
├── src/                # the Electron app (all logic lives here)
│   ├── main/           # Node main process: tts, models, ipc, settings, shortcuts, tray
│   ├── preload/        # contextBridge API
│   ├── renderer/       # React + Tailwind UI
│   └── shared/         # types shared across processes
├── models/             # *.onnx + *.onnx.json voices (gitignored, app-managed)
└── bin/venv/           # piper-tts engine (gitignored, created by the app)
```

## Credits

- Serbian voice: [`phantom9623/piper-serbian-tts`](https://huggingface.co/phantom9623/piper-serbian-tts)
- English voice & extras: [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)
- Engine: [Piper](https://github.com/rhasspy/piper) (via the `piper-tts` PyPI package)
