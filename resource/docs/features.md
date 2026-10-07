# Feature details

Deep detail on every Text Lantern feature — settings, edge cases, and how
things work under the hood. For the short list, see the
[README](../../README.md).

## Voices and languages

<img src="../screenshots/languages-global-shortcuts.png" height="480" alt="Languages screen" />

The app ships with two language bindings:

| Language | Default voice | Source |
|----------|---------------|--------|
| Serbian (`sr`) | `sr_Marko_medium` | phantom9623/piper-serbian-tts |
| English (`en`) | `en_US-lessac-medium` | rhasspy/piper-voices |

In the **Languages** section each language is one row: choose the voice that
reads it, the global shortcut that triggers reading, and a per-language speed.
Add any recognized language (the full list lives in
`src/shared/language/languages-raw.ts`), then pair it with an installed voice.
Each language and each shortcut may be used only once; conflicts are flagged.

Both Cyrillic and Latin Serbian input are supported by the Serbian voice.

**Auto-detect** (its own shortcut, and the tray's default action) detects the
language from the selected text (via
[tinyld](https://github.com/komodojp/tinyld)) and reads it with the matching
binding's voice; when the detected language has no binding, the default
(fallback) binding is used — the first binding until you pick another.

**Add more voices** (any from
[rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)) in the
Models section — some natural English options: `en_US-lessac-medium` (default),
`en_US-ryan-high` (male), `en_US-amy-medium` (female), `en_GB-cori-high`
(British), `en_GB-alan-medium` (male, British).

### Adding custom languages

The list of **recognized languages** shown in the UI can be extended via the
`languages` environment variable (a JSON array of `{ code, name }` objects).
The full behavior — name overrides, appending, case-normalization, invalid-JSON
fallbacks — is documented in
[development.md](development.md#environment-variables). Listing a language does
not install a voice for it; voices are resolved from what is installed or
downloaded at runtime.

## The two engines

- **[Piper](https://github.com/rhasspy/piper)** neural voices — it ships with a
  **Serbian** voice
  ([phantom9623/piper-serbian-tts](https://huggingface.co/phantom9623/piper-serbian-tts),
  `sr_Marko_medium`) and a natural **English** voice
  (`en_US-lessac-medium`), and you can add any other Piper voice. The Python
  `piper-tts` engine is installed and managed by the app in a private
  virtualenv (needs `python3` 3.9+ on your machine).
- **[Kokoro](https://github.com/hexgrad/kokoro)** (via
  [kokoro-js](https://github.com/hexgrad/kokoro-js)) — pure-JavaScript
  inference, no Python needed; all Kokoro voices share one ~88 MB model that
  downloads on first use.

On first launch, the **Models** section shows the engines as not installed.
Click **Install engine** — the app creates the virtualenv, installs
`piper-tts`, and downloads the default Serbian + English voices. Voices and
engines live in the app's userData folder, never inside the installation, so
they survive updates.

## Models section

<img src="../screenshots/models-all-voices.png" height="480" alt="Models screen — installed voices" />

Lists installed voices across both engines, filterable by All voices / Piper /
Kokoro; voices used by a language are marked "in use", and each voice can be
deleted.

<img src="../screenshots/models-piper-search.png" height="480" alt="Models screen — Piper search" />

Download more Piper voices three ways: search the whole Piper voice library,
paste a voice file URL, or pick from the app's favorites.

<img src="../screenshots/models-kokoro.png" height="480" alt="Models screen — Kokoro voices" />

Browse and download Kokoro voices in-app (one shared ~88 MB model).

## Shortcuts

Each language binding has its own global shortcut, and **auto-detect** and
**Stop** have their own shortcuts too. Each shortcut can be bound only once;
conflicts are flagged in the Languages section. On macOS, reading the
selection needs the app to have **Accessibility** permission (System Settings →
Privacy & Security → Accessibility).

Reading works by sending a Cmd+C (macOS) to copy the selected text; the
clipboard is saved and restored around the grab, so your clipboard isn't
disturbed.

## Speech settings

<img src="../screenshots/settings-spleech.png" height="480" alt="Speech settings" />

In **Settings → Speech**:

- **Reading-speed multiplier** — `2.0` reads twice as fast, `1.0` is normal,
  `0.5` half speed. It is inverted to Piper's `--length-scale` (`1 / speed`)
  at the engine. A per-language speed can override the global value.
- **Start delay** — lets Bluetooth headphones wake before playback starts.
- **Loading bleep** — a short sound while the engine prepares the audio.
- **Text-cleaning toggles** and a **character cap** for very long selections.

## The text cleaner

Before speaking, the text is cleaned (toggles in Settings → Speech):

- URLs (`https://…`, `www.…`, `example.com/path`) and e-mail addresses
- Markdown: `[text](url)` → `text`, images `![…]()` gone,
  `**bold**`/`__u__`/`~~s~~` stripped, headings & list markers dropped
- Inline and fenced code blocks
- Citation / reference markers (`[1]`, `[12, p. 3]`, `[citation needed]`)
- HTML tags
- Bracket characters `()[]{}` — by default the inner text is kept; *Strip
  bracket content* deletes the content too
- Extra whitespace and space-before-punctuation

## Window settings

<img src="../screenshots/settings-window.png" height="480" alt="Window settings" />

Theme and window behavior — start hidden, close to tray.

## Backup (Settings → Backup)

Export shortcuts, settings, and the voice list to a JSON file, or restore from
one — restore re-downloads any missing voices first.

## History

<img src="../screenshots/history.png" height="480" alt="History screen" />

Recent readings with replay, per-item delete, and a retention limit that caps
how many entries are kept.

## Test & Now Playing

The **Test** screen lets you audition voices before binding them. While
reading, a **Now Playing** bar shows what is being spoken and offers a Stop
button (the tray icon also reflects the reading state).

## Platform behavior

| | macOS | Linux | Windows |
|---|---|---|---|
| Installers | universal dmg | AppImage, deb | NSIS setup exe |
| Reading the selection | ✅ (simulates ⌘C) | ⚠️ reads the clipboard as-is | ⚠️ reads the clipboard as-is |
| Piper engine (Python) | ✅ | ✅ | best effort (needs `python` on PATH) |
| Kokoro engine (JavaScript) | ✅ | ✅ | ✅ |
