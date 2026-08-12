# TTS Reader — read selected text aloud (Serbian + English)

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

- **Menu-bar tray** with a reading-state icon and a menu (Read auto/Serbian/English,
  Stop, Settings, Quit).
- **Global shortcuts, one per language** (Settings → Shortcuts): Read–Auto,
  Read–Serbian, Read–English, Stop. Rebindable; conflicts are flagged.
- **Models** (Settings → Models): install the Piper engine, list installed voices,
  and download any Piper voice by name with a progress bar.
- **General**: default voice per language, speech speed, text-cleaning toggles,
  window prefs.
- A **Now Playing** bar shows synthesis/reading state with a Stop button.

## Selecting text

On macOS, reading the selection needs **Accessibility** permission for the app
(System Settings → Privacy & Security → Accessibility). The app sends a Cmd+C to
copy the selected text; the clipboard is saved and restored around the grab, so
your clipboard isn't disturbed.

## Voices & languages

| Tag | Default voice | Source |
|-----|---------------|--------|
| `sr` | `sr_Marko_medium` | phantom9623/piper-serbian-tts |
| `en` | `en_US-lessac-medium` | rhasspy/piper-voices |

**Auto-detection** (the default) picks Serbian if the text contains Cyrillic
letters or any of `č ć ž š đ`; otherwise English. This is unambiguous for
Cyrillic and Serbian-Latin-with-diacritics. For Serbian Latin *without* diacritics
(e.g. "Beograd je lep"), force Serbian via its shortcut / the tray menu.

**Add more voices** (any from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices))
in Settings → Models, e.g. `en_US-ryan-high` (male), `en_US-amy-medium` (female),
`en_GB-cori-high` (British). Some natural English options: `en_US-lessac-medium`
(default), `en_US-ryan-high` (male), `en_US-amy-medium` (female),
`en_GB-cori-high` (British), `en_GB-alan-medium` (male, British).

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

Speech speed maps to Piper's `length-scale` (General → Speech speed). `1.0` is
normal; higher is slower, lower is faster.

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
