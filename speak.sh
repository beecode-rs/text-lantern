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

set -uo pipefail

# ── Paths & config ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR/models"
PIPER_BIN="$SCRIPT_DIR/bin/venv/bin/piper"   # installed by install.sh (piper-tts)
CLEAN_PL="$SCRIPT_DIR/lib/clean.pl"

# Default voice per language (basename of the *.onnx in models/).
# Override via env: TTS_VOICE_SR / TTS_VOICE_EN
VOICE_SR_DEFAULT="${TTS_VOICE_SR:-sr_Marko_medium}"
VOICE_EN_DEFAULT="${TTS_VOICE_EN:-en_US-lessac-medium}"

# Voice chosen at runtime by resolve_voice().
MODEL_NAME=""
MODEL_ONNX=""
MODEL_JSON=""

OS="$(uname -s)"

RUN_DIR="${TTS_RUN_DIR:-${TMPDIR:-/tmp}}/tts-script-${USER:-$(id -un)}"
LOCK_FILE="$RUN_DIR/speak.lock"
mkdir -p "$RUN_DIR"

# ── Tiny helpers ─────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# Trim leading/trailing whitespace from a whole string.
trim_string() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

# ── Instance lock: only one speak runs; re-trigger / --stop kills the rest ──
lock_take() {
  if [[ -f "$LOCK_FILE" ]]; then
    local old
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

# ── Locale: best-effort UTF-8 so espeak-ng phonemises Cyrillic/Latin ─────────
ensure_utf8_locale() {
  local loc
  for loc in "${LC_ALL-}" "${LANG-}" "C.UTF-8" "en_US.UTF-8" "UTF-8"; do
    [[ -z "$loc" ]] && continue
    if locale -a 2>/dev/null | grep -Fixq "$loc"; then
      export LC_ALL="$loc" LANG="$loc"
      return 0
    fi
  done
}
ensure_utf8_locale

# ── Clipboard (cross-platform) ───────────────────────────────────────────────
# Echo the available backend name, or fail.
clipboard_backend() {
  case "$OS" in
    Darwin) echo pb ;;
    *)
      if have wl-paste && [[ -n "${WAYLAND_DISPLAY-}" ]]; then echo wl
      elif have xclip; then echo xclip
      elif have xsel; then echo xsel
      else return 1; fi ;;
  esac
}
clipboard_get() {
  case "$(clipboard_backend)" in
    pb)    pbpaste 2>/dev/null ;;
    wl)    wl-paste 2>/dev/null ;;
    xclip) xclip -o -selection clipboard 2>/dev/null ;;
    xsel)  xsel -ob 2>/dev/null ;;
    *)     return 1 ;;
  esac
}
clipboard_set() {
  case "$(clipboard_backend)" in
    pb)    pbcopy 2>/dev/null ;;
    wl)    wl-copy 2>/dev/null ;;
    xclip) xclip -i -selection clipboard 2>/dev/null ;;
    xsel)  xsel -bi 2>/dev/null ;;
    *)     return 1 ;;
  esac
}

# Send Ctrl/Cmd+C so the active selection lands in the clipboard.
send_copy_keystroke() {
  case "$OS" in
    Darwin)
      osascript -e 'tell application "System Events" to keystroke "c" using command down' >/dev/null 2>&1 ;;
    *)
      if [[ -n "${WAYLAND_DISPLAY-}" ]]; then
        if have wtype;     then wtype -M ctrl -k c >/dev/null 2>&1
        elif have ydotool; then ydotool key ctrl+c >/dev/null 2>&1
        else return 1; fi
      elif have xdotool; then xdotool key --clearmodifiers ctrl+c >/dev/null 2>&1
      else return 1; fi ;;
  esac
}

# Grab the current selection. Saves & restores the clipboard around the copy.
grab_selection() {
  local saved sel
  saved="$(clipboard_get 2>/dev/null || true)"
  send_copy_keystroke || die "Cannot grab selection: need 'osascript' (macOS), 'xdotool' (X11), or 'wtype'/'ydotool' (Wayland)."
  sleep 0.18   # let the copy reach the clipboard
  sel="$(clipboard_get 2>/dev/null || true)"
  printf '%s' "$saved" | clipboard_set 2>/dev/null || true   # restore clipboard
  printf '%s' "$sel"
}

# ── Language detection ───────────────────────────────────────────────────────
# True (0) if the text has Cyrillic or a Serbian diacritic (č ć ž š đ).
# Code points (not literals) keep the perl source ASCII-clean.
looks_like_serbian() {
  printf '%s' "$1" \
    | perl -CSD -0777 -ne 'exit( /[\x{0400}-\x{04FF}\x{0106}\x{0107}\x{010C}\x{010D}\x{0110}\x{0111}\x{0160}\x{0161}\x{017D}\x{017E}]/ ? 0 : 1 )'
}

# Resolve MODEL_NAME / paths from: --voice > --lang {sr,en} > auto-detect.
resolve_voice() {
  local text="$1"
  if [[ -n "$MODEL_OVERRIDE" ]]; then
    MODEL_NAME="$MODEL_OVERRIDE"
  else
    case "$LANG_SEL" in
      sr)   MODEL_NAME="$VOICE_SR_DEFAULT" ;;
      en)   MODEL_NAME="$VOICE_EN_DEFAULT" ;;
      auto) if looks_like_serbian "$text"; then MODEL_NAME="$VOICE_SR_DEFAULT"
            else MODEL_NAME="$VOICE_EN_DEFAULT"; fi ;;
      *) die "unknown --lang '$LANG_SEL' (use sr, en, or auto)." ;;
    esac
  fi
  MODEL_ONNX="$MODELS_DIR/${MODEL_NAME}.onnx"
  MODEL_JSON="$MODELS_DIR/${MODEL_NAME}.onnx.json"
  [[ -s "$MODEL_ONNX" ]] || die "Voice '$MODEL_NAME' not found ($MODEL_ONNX).
  Install it with: $SCRIPT_DIR/install.sh --add-voice $MODEL_NAME"
  [[ -s "$MODEL_JSON" ]] || die "Voice config not found ($MODEL_JSON). Re-run $SCRIPT_DIR/install.sh."
}

# ── Text cleaning ────────────────────────────────────────────────────────────
clean_text() {
  if have perl; then
    STRIP="$STRIP_BRACKETS" perl -0777 -CSD "$CLEAN_PL"
  else
    # Minimal fallback when perl is unavailable.
    sed -E -e 's#https?://[^ ]+##g' -e 's#www\.[^ ]+##g' -e 's/[][(){}]//g' -e 's/[ \t]+/ /g'
  fi
}

# ── Audio playback (picks the first available player) ────────────────────────
play_audio() {
  local wav="$1" p
  for p in afplay paplay aplay ffplay mpv play; do
    have "$p" || continue
    case "$p" in
      afplay) afplay "$wav" ;;
      paplay) paplay "$wav" ;;
      aplay)  aplay -q "$wav" ;;
      ffplay) ffplay -nodisp -autoexit -loglevel quiet "$wav" ;;
      mpv)    mpv --no-video --really-quiet "$wav" ;;
      play)   play -q "$wav" ;;
    esac
    return 0
  done
  return 1
}

# ── Options ──────────────────────────────────────────────────────────────────
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
    --stop)              ACTION="stop"; shift ;;
    --lang)              LANG_SEL="$2"; shift 2 ;;
    --lang=*)            LANG_SEL="${1#*=}"; shift ;;
    --voice|--model)     MODEL_OVERRIDE="$2"; shift 2 ;;
    --voice=*|--model=*) MODEL_OVERRIDE="${1#*=}"; shift ;;
    --list-voices)       ACTION="list"; shift ;;
    --rate)              RATE="$2"; shift 2 ;;
    --rate=*)            RATE="${1#*=}"; shift ;;
    --noise)             NOISE_SCALE="$2"; shift 2 ;;
    --noise-w)           NOISE_W="$2"; shift 2 ;;
    --raw)               CLEAN=0; shift ;;
    --strip-brackets)    STRIP_BRACKETS=1; shift ;;
    --max-chars)         MAX_CHARS="$2"; shift 2 ;;
    --output)            OUTPUT_WAV="$2"; shift 2 ;;
    -h|--help)           usage; exit 0 ;;
    --) shift; while [[ $# -gt 0 ]]; do TEXT_ARGS+=("$1"); shift; done ;;
    -*)                  die "unknown option: $1 (try --help)" ;;
    *)                   TEXT_ARGS+=("$1"); shift ;;
  esac
done

# ── Action: list voices ──────────────────────────────────────────────────────
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

# ── Action: stop ─────────────────────────────────────────────────────────────
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

# ── Sanity check ─────────────────────────────────────────────────────────────
[[ -x "$PIPER_BIN" ]] || die "Piper not found. Run: $SCRIPT_DIR/install.sh"

# ── Acquire text: args > stdin (if piped) > selection ────────────────────────
if [[ ${#TEXT_ARGS[@]} -gt 0 ]]; then
  RAW_TEXT="${TEXT_ARGS[*]}"
elif [[ ! -t 0 ]]; then
  RAW_TEXT="$(cat)"
else
  RAW_TEXT="$(grab_selection)"
fi
[[ -n "$RAW_TEXT" ]] || { echo "No text to speak."; exit 0; }

# ── Clean & trim ─────────────────────────────────────────────────────────────
if [[ "$CLEAN" -eq 1 ]]; then
  TEXT="$(printf '%s' "$RAW_TEXT" | clean_text)"
else
  TEXT="$(trim_string "$RAW_TEXT")"
fi
[[ -n "$TEXT" ]] || { echo "Nothing left to speak after cleaning."; exit 0; }

# ── Resolve voice, then cap length ───────────────────────────────────────────
resolve_voice "$TEXT"
printf 'voice: %s\n' "$MODEL_NAME" >&2
if [[ "$MAX_CHARS" -gt 0 && ${#TEXT} -gt "$MAX_CHARS" ]]; then
  TEXT="${TEXT:0:$MAX_CHARS} …"
fi

# ── Synthesise ───────────────────────────────────────────────────────────────
# Take the lock: a previous run (synth or play) is stopped first, so re-trigger
# of the hotkey restarts cleanly.
lock_take
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; lock_release' EXIT INT TERM
WAV="${OUTPUT_WAV:-$WORK/out.wav}"

piper_args=( -m "$MODEL_ONNX" -c "$MODEL_JSON" -f "$WAV" --length-scale "$RATE" )
[[ -n "$NOISE_SCALE" ]] && piper_args+=( --noise-scale "$NOISE_SCALE" )
[[ -n "$NOISE_W" ]]     && piper_args+=( --noise-w-scale "$NOISE_W" )

if ! printf '%s\n' "$TEXT" | "$PIPER_BIN" "${piper_args[@]}" 2>"$WORK/piper.err"; then
  cat "$WORK/piper.err" >&2
  die "Piper synthesis failed."
fi

[[ -n "$OUTPUT_WAV" ]] && { echo "wrote $OUTPUT_WAV"; exit 0; }
[[ -s "$WAV" ]] || die "Piper produced no audio."

# ── Play (runs as a child of this PID, so --stop / re-trigger interrupt it) ──
play_audio "$WAV" || die "No audio player found (afplay/paplay/aplay/ffplay/mpv/sox)."
lock_release
