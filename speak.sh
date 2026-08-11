#!/usr/bin/env bash
#
# speak.sh — read text aloud with Piper TTS (Serbian + English).
#
# Cross-platform (macOS + Linux). Designed to be bound to an OS hotkey so it
# reads the currently-selected text, but it also accepts text as an argument,
# via stdin (for piping), and cleans it up (strips URLs, markdown, code,
# bracket characters, citations…) before speaking. Language is auto-detected
# (Cyrillic / Serbian diacritics → Serbian, else English) or set with --lang.
#
# Usage:
#   ./speak.sh                      # speak the current text selection (auto lang)
#   ./speak.sh --lang sr "…"        # force Serbian voice
#   ./speak.sh --lang en "…"        # force English voice
#   ./speak.sh "some text"          # speak the given argument(s)
#   echo "text" | ./speak.sh        # speak from stdin
#   ./speak.sh --list-voices        # show installed voices
#   ./speak.sh --stop               # stop any playback in progress
#   ./speak.sh --rate 1.2 "…"       # 1.0 = normal, >1 slower, <1 faster
#   ./speak.sh --raw                # skip text cleaning
#   ./speak.sh --output out.wav "…" # write WAV instead of playing
#   ./speak.sh -h                   # full help
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="$SCRIPT_DIR/bin"
MODELS_DIR="$SCRIPT_DIR/models"
PIPER_BIN="$BIN_DIR/venv/bin/piper"        # installed by install.sh (piper-tts)

# ── Voice registry ──────────────────────────────────────────────────────────
# Maps a language tag to a default voice (basename of the *.onnx in models/).
# Override with env: TTS_VOICE_SR / TTS_VOICE_EN
VOICE_SR_DEFAULT="${TTS_VOICE_SR:-sr_Marko_medium}"
VOICE_EN_DEFAULT="${TTS_VOICE_EN:-en_US-lessac-medium}"
MODEL_NAME=""          # resolved later from --lang / --voice / auto-detection
MODEL_ONNX=""          # set after resolution
MODEL_JSON=""

# Runtime dir for the instance lock / temp audio
RUN_DIR="${TTS_RUN_DIR:-${TMPDIR:-/tmp}}/tts-script-${USER:-$(id -un)}"
LOCK_FILE="$RUN_DIR/speak.lock"
mkdir -p "$RUN_DIR"

# Kill a previous instance (and its children: piper / player) and take the lock.
lock_take() {
  if [[ -f "$LOCK_FILE" ]]; then
    old="$(cat "$LOCK_FILE" 2>/dev/null || true)"
    if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
      pkill -P "$old" 2>/dev/null || true   # reap children (piper, player)
      kill "$old" 2>/dev/null || true
    fi
    rm -f "$LOCK_FILE"
  fi
  echo "$$" > "$LOCK_FILE"
}
lock_release() { rm -f "$LOCK_FILE"; }

have() { command -v "$1" >/dev/null 2>&1; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
# Defaults / option parsing
# ─────────────────────────────────────────────────────────────────────────────
RATE=1.0            # piper length-scale: higher = slower
NOISE_SCALE=""      # leave model default unless set
NOISE_W=""
CLEAN=1             # 1 = clean text, 0 = --raw
STRIP_BRACKETS=0    # 1 = also delete content inside ( ) [ ] { }
MAX_CHARS=6000      # safety cap on characters spoken (0 = unlimited)
OUTPUT_WAV=""       # if set, write WAV here and skip playback
ACTION="speak"
TEXT_ARGS=()
LANG_SEL="auto"     # sr | en | auto
MODEL_OVERRIDE=""   # set by --voice / --model

usage() {
  sed -n '3,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'OPT'

Options:
  --lang {sr,en,auto}    Pick the voice. auto (default) detects from the text:
                         Cyrillic or Serbian diacritics (čćžšđ) → Serbian,
                         otherwise English. Use sr / en for an explicit choice
                         (handy for two hotkeys).
  --voice NAME           Use a specific installed voice basename
                         (e.g. en_US-ryan-high). Overrides --lang.
  --list-voices          List voices available in ./models and exit.
  --stop                 Stop playback currently in progress.
  --rate N               Speech speed (piper length-scale). 1.0 = normal,
                         1.3 = slower, 0.8 = faster. Default 1.0
  --noise N              Noise scale (prosody randomness). Default: model's.
  --noise-w N            Noise width (phoneme width variance) ("noise-w-scale").
  --raw                  Do not clean the text at all.
  --strip-brackets       Delete the *content* of ( ) [ ] { } entirely
                         (default: brackets are removed but inner text kept).
  --max-chars N          Cap input length (default 6000, 0 = unlimited).
  --output FILE.wav      Write WAV to FILE and exit (no playback).
  -h, --help             Show this help.
OPT
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stop)            ACTION="stop"; shift ;;
    --lang)            LANG_SEL="$2"; shift 2 ;;
    --lang=*)          LANG_SEL="${1#*=}"; shift ;;
    --voice|--model)   MODEL_OVERRIDE="$2"; shift 2 ;;
    --voice=*|--model=*) MODEL_OVERRIDE="${1#*=}"; shift ;;
    --list-voices)     ACTION="list"; shift ;;
    --rate)            RATE="$2"; shift 2 ;;
    --rate=*)          RATE="${1#*=}"; shift ;;
    --noise)           NOISE_SCALE="$2"; shift 2 ;;
    --noise-w)         NOISE_W="$2"; shift 2 ;;
    --raw)             CLEAN=0; shift ;;
    --strip-brackets)  STRIP_BRACKETS=1; shift ;;
    --max-chars)       MAX_CHARS="$2"; shift 2 ;;
    --output)          OUTPUT_WAV="$2"; shift 2 ;;
    -h|--help)         usage; exit 0 ;;
    --)                shift; while [[ $# -gt 0 ]]; do TEXT_ARGS+=("$1"); shift; done ;;
    -*)                die "unknown option: $1 (try --help)" ;;
    *)                 TEXT_ARGS+=("$1"); shift ;;
  esac
done

# ─────────────────────────────────────────────────────────────────────────────
# LIST-VOICES action
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$ACTION" == "list" ]]; then
  printf 'Installed voices in %s:\n\n' "$MODELS_DIR"
  found=0
  for onnx in "$MODELS_DIR"/*.onnx; do
    [[ -e "$onnx" ]] || continue
    name="$(basename "$onnx" .onnx)"
    mark=""
    case "$name" in
      "$VOICE_SR_DEFAULT") mark="  [sr default]" ;;
      "$VOICE_EN_DEFAULT") mark="  [en default]" ;;
    esac
    printf '  %s%s\n' "$name" "$mark"
    found=1
  done
  [[ $found -eq 0 ]] && echo "  (none — run ./install.sh)"
  echo
  echo "Use any of the above with: ./speak.sh --voice <name>"
  echo "Switch language with:        ./speak.sh --lang sr | en | auto"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# STOP action: kill whatever is currently playing
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$ACTION" == "stop" ]]; then
  if [[ -f "$LOCK_FILE" ]]; then
    pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$LOCK_FILE"
    echo "stopped."
  else
    echo "nothing playing."
  fi
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# Sanity checks
# ─────────────────────────────────────────────────────────────────────────────
[[ -x "$PIPER_BIN" ]] || die "Piper not found. Run: $SCRIPT_DIR/install.sh"

# Resolve which voice to use: --voice/--model > --lang {sr,en} > auto-detect.
# Auto = Serbian if the text has Cyrillic letters or the diacritics č ć ž š đ.
resolve_voice() {
  local text="$1"
  if [[ -n "$MODEL_OVERRIDE" ]]; then
    MODEL_NAME="$MODEL_OVERRIDE"
  else
    case "$LANG_SEL" in
      sr) MODEL_NAME="$VOICE_SR_DEFAULT" ;;
      en) MODEL_NAME="$VOICE_EN_DEFAULT" ;;
      auto)
        # SR if any Cyrillic letter or a Serbian diacritic (č ć ž š đ) is present.
        # Code points used (not literals) so the -e source stays ASCII-clean.
        if printf '%s' "$text" | perl -CSD -0777 -ne 'exit( /[\x{0400}-\x{04FF}\x{0106}\x{0107}\x{010C}\x{010D}\x{0110}\x{0111}\x{0160}\x{0161}\x{017D}\x{017E}]/ ? 0 : 1 )'; then
          MODEL_NAME="$VOICE_SR_DEFAULT"
        else
          MODEL_NAME="$VOICE_EN_DEFAULT"
        fi ;;
      *) die "unknown --lang '$LANG_SEL' (use sr, en, or auto)." ;;
    esac
  fi
  MODEL_ONNX="$MODELS_DIR/${MODEL_NAME}.onnx"
  MODEL_JSON="$MODELS_DIR/${MODEL_NAME}.onnx.json"
  [[ -s "$MODEL_ONNX" ]] || die "Voice '$MODEL_NAME' not found ($MODEL_ONNX).
  Install it with: $SCRIPT_DIR/install.sh --add-voice $MODEL_NAME"
  [[ -s "$MODEL_JSON" ]] || die "Voice config not found ($MODEL_JSON). Re-run $SCRIPT_DIR/install.sh."
}

# Best-effort: switch to a UTF-8 locale so espeak-ng phonemises Cyrillic/Latin.
ensure_utf8_locale() {
  local loc
  for loc in "${LC_ALL-}" "${LANG-}" "C.UTF-8" "en_US.UTF-8" "UTF-8"; do
    [[ -z "$loc" ]] && continue
    if locale -a 2>/dev/null | grep -Fixq "$loc"; then export LC_ALL="$loc" LANG="$loc"; return 0; fi
  done
  return 0
}
ensure_utf8_locale

# ─────────────────────────────────────────────────────────────────────────────
# Clipboard helpers (cross-platform)
# ─────────────────────────────────────────────────────────────────────────────
clipboard_get() {
  case "$(uname -s)" in
    Darwin) pbpaste 2>/dev/null ;;
    *)
      if have wl-paste && [[ -n "${WAYLAND_DISPLAY-}" ]]; then wl-paste 2>/dev/null
      elif have xclip;  then xclip -o -selection clipboard 2>/dev/null
      elif have xsel;   then xsel -ob 2>/dev/null
      else return 1; fi ;;
  esac
}
clipboard_set() {
  case "$(uname -s)" in
    Darwin) pbcopy 2>/dev/null ;;
    *)
      if have wl-copy && [[ -n "${WAYLAND_DISPLAY-}" ]]; then wl-copy 2>/dev/null
      elif have xclip;  then xclip -i -selection clipboard 2>/dev/null
      elif have xsel;   then xsel -bi 2>/dev/null
      else return 1; fi ;;
  esac
}

# Send the OS "copy" keystroke (Ctrl/Cmd+C) so the active selection lands in the
# clipboard. Returns non-zero if it can't (missing tooling).
send_copy_keystroke() {
  case "$(uname -s)" in
    Darwin)
      osascript -e 'tell application "System Events" to keystroke "c" using command down' >/dev/null 2>&1 ;;
    *)
      if [[ -n "${WAYLAND_DISPLAY-}" ]]; then
        if have wtype;        then wtype -M ctrl -k c >/dev/null 2>&1
        elif have ydotool;    then ydotool key ctrl+c >/dev/null 2>&1
        else return 1; fi
      elif have xdotool; then xdotool key --clearmodifiers ctrl+c >/dev/null 2>&1
      else return 1; fi ;;
  esac
}

# Grab the currently-selected text. Saves & restores the clipboard so the user
# doesn't lose what they had copied.
grab_selection() {
  local saved sel
  saved="$(clipboard_get 2>/dev/null || true)"
  if ! send_copy_keystroke; then
    die "Cannot grab selection: need 'osascript' (macOS), 'xdotool' (X11), or 'wtype'/'ydotool' (Wayland)."
  fi
  sleep 0.18   # let the copy land in the clipboard
  sel="$(clipboard_get 2>/dev/null || true)"
  # restore the user's clipboard
  printf '%s' "$saved" | clipboard_set 2>/dev/null || true
  printf '%s' "$sel"
}

# ─────────────────────────────────────────────────────────────────────────────
# Acquire raw text: args > stdin (if piped) > selection
# ─────────────────────────────────────────────────────────────────────────────
if [[ ${#TEXT_ARGS[@]} -gt 0 ]]; then
  RAW_TEXT="${TEXT_ARGS[*]}"
elif [[ ! -t 0 ]]; then
  RAW_TEXT="$(cat)"
else
  RAW_TEXT="$(grab_selection)"
fi

[[ -n "$RAW_TEXT" ]] || { echo "No text to speak."; exit 0; }

# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing — remove links, markdown, code, citation markers; drop bracket
# characters so the synth never reads "bracket" / "slash" etc.
# ─────────────────────────────────────────────────────────────────────────────
clean_text() {
  if ! have perl; then
    # Fallback: no perl — just normalise whitespace and strip a few things.
    sed -E -e 's/https?:\/\/[^ ]+//g' \
           -e 's/www\.[^ ]+//g' \
           -e 's/[][(){}]//g' \
           -e 's/[ \t]+/ /g' \
           -e 's/^ | $//g'
    return
  fi
  STRIP="${STRIP_BRACKETS}" perl -0777 -CSD -pe '
    # fenced code blocks ```...```
    s/```.*?```//gs;
    # inline code `...`
    s/`[^`\n]*`//g;
    # markdown images  ![alt](url)
    s/!\[[^\]]*\]\([^)]*\)//g;
    # markdown links  [text](url) -> text
    s/\[([^\]]+)\]\(([^)]*)\)/$1/g;
    # html tags
    s/<[^>]+>//g;
    # e-mail addresses
    s/\b[\w.+-]+\@[\w.-]+\.\w+\b//g;
    # http(s) and www urls
    s{\bhttps?://\S+}{}g;
    s{\bwww\.\S+}{}g;
    # bare domain/path links like example.com/foo
    s{\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:/\S*)?}{}gi;
    # citation / reference markers  [1] [12] [1a] [2, p. 4]
    s/\[\s*\d+(?:\s*[,\-–.]?\s*[A-Za-z0-9.]*)*\s*\]//g;
    # common wiki annotations
    s/\[(?:citation\s+needed|edit|sic|ref|fn\s+\d+|note\s+\d+|nb\s+\d+)\]//gi;
    # leading list markers / heading hashes / blockquote
    s/^[ \t]*([-*+]|\d+[.)]|#{1,6}|>)[ \t]*//gm;
    if ($ENV{STRIP}) {
      s/\([^)]*\)//g; s/\[[^\]]*\]//g; s/\{[^}]*\}//g;
    } else {
      # keep inner text, just drop the bracket characters
      tr/[](){}//d;
    }
    # leftover markdown decoration
    s/[*_~|>#]/ /g;
    # collapse whitespace
    s/[ \t]+/ /g;
    # fix "word ." -> "word." left by removed markers
    s/[ \t]+([.,;:!?])/$1/g;
    s/\n[ \t]+/\n/g;
    s/[ \t]+\n/\n/g;
    s/\n{3,}/\n\n/g;
    s/^\s+|\s+$//g;
  '
}

if [[ "$CLEAN" -eq 1 ]]; then
  TEXT="$(printf '%s' "$RAW_TEXT" | clean_text)"
else
  TEXT="$RAW_TEXT"
fi

TEXT="${TEXT#"${TEXT%%[![:space:]]*}"}"   # trim leading
TEXT="${TEXT%"${TEXT##*[![:space:]]}"}"   # trim trailing
[[ -n "$TEXT" ]] || { echo "Nothing left to speak after cleaning."; exit 0; }

# Pick the voice (auto-detect unless --lang/--voice given), then verify files.
resolve_voice "$TEXT"
echo "[voice: $MODEL_NAME]" >&2

# safety cap
if [[ "$MAX_CHARS" -gt 0 && ${#TEXT} -gt "$MAX_CHARS" ]]; then
  TEXT="${TEXT:0:$MAX_CHARS} …"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Synthesise with Piper
# ─────────────────────────────────────────────────────────────────────────────
# Take over the lock: if a previous speak is running (synth or play), stop it
# first — so re-triggering the hotkey restarts cleanly.
lock_take
WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; lock_release; }
trap 'cleanup' EXIT INT TERM
WAV="${OUTPUT_WAV:-$WORK/out.wav}"

# piper-tts (Python) bundles espeak-ng data, so no -d / data-dir is needed.
piper_args=( -m "$MODEL_ONNX" -c "$MODEL_JSON" -f "$WAV"
             --length-scale "$RATE" )
[[ -n "$NOISE_SCALE" ]] && piper_args+=( --noise-scale "$NOISE_SCALE" )
[[ -n "$NOISE_W" ]]     && piper_args+=( --noise-w-scale "$NOISE_W" )

if ! printf '%s\n' "$TEXT" | "$PIPER_BIN" "${piper_args[@]}" 2>"$WORK/piper.err"; then
  cat "$WORK/piper.err" >&2
  die "Piper synthesis failed."
fi

# If only writing a file, we're done.
if [[ -n "$OUTPUT_WAV" ]]; then
  echo "wrote $OUTPUT_WAV"
  exit 0
fi

[[ -s "$WAV" ]] || die "Piper produced no audio."

# ─────────────────────────────────────────────────────────────────────────────
# Play (cross-platform). The player runs as a child of this process ($$), so
# --stop / re-trigger (which kill our PID + children) interrupt it cleanly.
# ─────────────────────────────────────────────────────────────────────────────
pick_player() {
  for c in afplay paplay aplay ffplay mpv play; do
    have "$c" && { printf '%s\n' "$c"; return; }
  done
  return 1
}

PLAYER="$(pick_player)" || die "No audio player found (afplay/paplay/aplay/ffplay/mpv/sox)."

case "$PLAYER" in
  afplay) afplay "$WAV" ;;
  paplay) paplay "$WAV" ;;
  aplay)  aplay -q "$WAV" ;;
  ffplay) ffplay -nodisp -autoexit -loglevel quiet "$WAV" ;;
  mpv)    mpv --no-video --really-quiet "$WAV" ;;
  play)   play -q "$WAV" ;;
esac

lock_release
