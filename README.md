# Serbian + English TTS (Piper) — read selected text aloud

A small, cross-platform (**macOS + Linux**) bash tool that reads text aloud using
[Piper](https://github.com/rhasspy/piper) neural voices. It ships with a
**Serbian** voice ([phantom9623/piper-serbian-tts](https://huggingface.co/phantom9623/piper-serbian-tts),
`sr_Marko_medium`) and a natural **English** voice (`en_US-lessac-medium`), and
you can add any other Piper voice.

Designed to be bound to an OS hotkey: press it and the currently-selected text
is cleaned (URLs, markdown, code, citation markers and bracket characters
stripped) and spoken. Language is **auto-detected** (Cyrillic or Serbian
diacritics → Serbian, otherwise English), or you force it with `--lang`.

Both Cyrillic and Latin Serbian input are supported by the Serbian voice.

## Requirements

- **bash** (works on macOS's stock bash 3.2; no bash-4-only features)
- **python3** 3.9+ (for the `piper-tts` engine)
- **curl** (to download models)
- An audio player: `afplay` (macOS, built-in) / `paplay` / `aplay` / `ffplay` / `mpv` / `play` (any one)
- *To grab the text selection from a hotkey:*
  - macOS: none extra (uses `pbpaste` + `osascript`)
  - Linux X11: `xdotool` + (`xclip` or `xsel`)
  - Linux Wayland: `wtype` (or `ydotool`) + `wl-clipboard`

## Setup

```bash
./install.sh
```

This creates a private Python virtualenv in `bin/venv`, installs `piper-tts`,
and downloads the Serbian + English voice models into `models/`. Re-run any
time; `--force` recreates everything.

## Usage

```bash
# Speak the current text selection (language auto-detected):
./speak.sh

# Force a language (handy for two separate hotkeys):
./speak.sh --lang sr           # Serbian voice
./speak.sh --lang en           # English voice

# Speak an argument or a pipe:
./speak.sh "Здраво! Ово је проба."
echo "Hello from the terminal." | ./speak.sh

# List installed voices:
./speak.sh --list-voices

# Use a specific installed voice (overrides --lang):
./speak.sh --voice en_US-ryan-high "Deeper male voice."

# Stop playback:
./speak.sh --stop

# Options: speed, cleaning, file output…
./speak.sh --rate 1.3 "Спорије."     # length-scale: >1 slower, <1 faster
./speak.sh --output out.wav "…"
./speak.sh --raw "raw [markdown](http://x) text"
./speak.sh --help
```

### Voices & languages

| Tag | Default voice | Source |
|-----|---------------|--------|
| `sr` | `sr_Marko_medium` | phantom9623/piper-serbian-tts |
| `en` | `en_US-lessac-medium` | rhasspy/piper-voices |

**Auto-detection** (`--lang auto`, the default) picks Serbian if the text
contains Cyrillic letters or any of `č ć ž š đ`; otherwise English. This is
unambiguous for Cyrillic and Serbian-Latin-with-diacritics. For Serbian Latin
*without* diacritics (e.g. "Beograd je lep"), force it with `--lang sr`.

**Add more voices** (any from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)):

```bash
./install.sh --add-voice en_US-ryan-high     # natural male US English
./install.sh --add-voice en_GB-cori-high     # British English
./install.sh --add-voice en_US-amy-medium    # female US English
./speak.sh --voice en_US-ryan-high "Hello."
```

Some natural English options: `en_US-lessac-medium` (default), `en_US-ryan-high`
(male), `en_US-amy-medium` (female), `en_GB-cori-high` (British), `en_GB-alan-medium`
(male, British). Use `--list-voices` to see what's installed.

You can also change the defaults with environment variables, e.g. in your shell
profile: `export TTS_VOICE_EN=en_US-ryan-high`.

### What the cleaner removes

- URLs (`https://…`, `www.…`, `example.com/path`) and e-mail addresses
- Markdown: `[text](url)` → `text`, images `![…]()` gone, `**bold**`/`__u__`/`~~s~~` stripped, headings & list markers dropped
- Inline and fenced code blocks
- Citation / reference markers (`[1]`, `[12, p. 3]`, `[citation needed]`)
- HTML tags
- Bracket characters `()[]{}` — by default the inner text is kept; `--strip-brackets` deletes the content too
- Extra whitespace and space-before-punctuation

### Speed / prosody

`--rate` maps to Piper's `length-scale`. `--noise` (prosody randomness) and
`--noise-w` (phoneme-width variance) override the model defaults if given.

## Binding it to a hotkey

### macOS

The selection-grabber needs **Accessibility** permission for the app that runs
the hotkey (System Settings → Privacy & Security → Accessibility), because it
sends a Cmd+C keystroke. The clipboard is saved and restored around the grab,
so your clipboard isn't disturbed.

Bind hotkeys (Shortcuts app, Automator, `skhd`, Hammerspoon, Raycast…) to:

```bash
/Users/you/path/tts-script/speak.sh              # speak selection (auto language)
/Users/you/path/tts-script/speak.sh --stop       # stop
```

For explicit language hotkeys:

```bash
/Users/you/path/tts-script/speak.sh --lang sr    # Serbian
/Users/you/path/tts-script/speak.sh --lang en    # English
```

> Pressing the speak hotkey again while it's talking stops and restarts with the
> new selection; `--stop` just stops.

### Linux

Point your window manager's hotkey at the script (X11 or Wayland). Sway/Hyprland
example:

```
bind = SUPER, S,       exec, /home/you/path/tts-script/speak.sh
bind = SUPER SHIFT, S, exec, /home/you/path/tts-script/speak.sh --stop
```

## Project layout

```
tts-script/
├── install.sh        # venv + download voices; --add-voice for extras
├── speak.sh          # main script (call from a hotkey)
├── README.md
├── bin/venv/         # piper-tts engine  (created by install.sh, gitignored)
└── models/           # *.onnx + *.onnx.json  (gitignored)
```

## Notes

- The `piper-tts` Python package bundles espeak-ng, so no system espeak-ng is
  needed on most platforms. If `pip install piper-tts` fails on Linux, install
  the headers (`sudo apt install espeak-ng-dev`) and re-run `./install.sh`.
- Everything runs fully on-device; nothing is sent anywhere.

## Credits

- Serbian voice: [`phantom9623/piper-serbian-tts`](https://huggingface.co/phantom9623/piper-serbian-tts)
- English voice & extras: [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)
- Engine: [Piper](https://github.com/rhasspy/piper) (via the `piper-tts` PyPI package)
