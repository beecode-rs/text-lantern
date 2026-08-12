#!/usr/bin/env bash
#
# install.sh — set up the Piper Serbian + English TTS tool.
# Cross-platform: macOS (arm64 / x86_64) and Linux (x86_64 / aarch64 / armv7l).
#
# Creates a private Python virtualenv, installs the official `piper-tts` package,
# and downloads the default Serbian and English voice models. (The prebuilt C++
# binaries from rhasspy/piper ship incomplete on macOS, so we use the Python
# package, which bundles espeak-ng and works everywhere.)
#
# Usage:
#   ./install.sh                              # venv + Serbian + English voices
#   ./install.sh --force                      # recreate venv and re-download voices
#   ./install.sh --add-voice en_US-ryan-high  # add any Piper voice by name
#
set -euo pipefail

# ── Paths & voice registry (keep in sync with speak.sh) ──────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/bin/venv"
MODELS_DIR="$SCRIPT_DIR/models"

SR_VOICE="${TTS_VOICE_SR:-sr_Marko_medium}"        # Serbian (Cyrillic + Latin)
EN_VOICE="${TTS_VOICE_EN:-en_US-lessac-medium}"    # English (natural, US)
SR_REPO="https://huggingface.co/phantom9623/piper-serbian-tts/resolve/main"
VOICES_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main"

# ── Args ─────────────────────────────────────────────────────────────────────
FORCE=0
ADD_VOICE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --add-voice) ADD_VOICE="$2"; shift 2 ;;
    --add-voice=*) ADD_VOICE="${1#*=}"; shift ;;
    -h|--help) sed -n '3,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

have curl || { echo "error: 'curl' is required." >&2; exit 1; }
mkdir -p "$MODELS_DIR"

# ── Voice download helpers ───────────────────────────────────────────────────
# Download <url_prefix>/<name>.onnx(.json) into models/, skipping files already
# present unless --force.
download_voice_files() {
  local name="$1" prefix="$2" ext dest
  for ext in onnx onnx.json; do
    dest="$MODELS_DIR/$name.$ext"
    if [[ -s "$dest" && $FORCE -eq 0 ]]; then
      log "  present: $name.$ext"
      continue
    fi
    curl -fL --progress-bar -o "$dest" "$prefix/$name.$ext"
  done
}

# Serbian voice lives in its own custom repo.
download_serbian() {
  log "Voice: $SR_VOICE (Serbian)"
  download_voice_files "$SR_VOICE" "$SR_REPO"
}

# Generic Piper voice from rhasspy/piper-voices.
# name = <lang>_<region>-<voice>-<quality>  (the voice part uses underscores)
download_piper_voice() {
  local name="$1" lang_region rest quality voice lang prefix
  lang_region="${name%%-*}"; rest="${name#*-}"
  quality="${rest##*-}"; voice="${rest%-*}"
  lang="${lang_region%%_*}"
  prefix="$VOICES_BASE/$lang/$lang_region/$voice/$quality"
  log "Voice: $name"
  download_voice_files "$name" "$prefix"
}

# ── --add-voice: fetch one voice and exit ────────────────────────────────────
if [[ -n "$ADD_VOICE" ]]; then
  if [[ "$ADD_VOICE" == "$SR_VOICE" ]]; then
    download_serbian
  else
    download_piper_voice "$ADD_VOICE"
  fi
  echo
  log "Done. Use it with: ./speak.sh --voice $ADD_VOICE"
  exit 0
fi

# ── Python check ─────────────────────────────────────────────────────────────
have python3 || { echo "error: 'python3' is required (3.9+)." >&2; exit 1; }
IFS=' ' read -r PY_MAJ PY_MIN < <(python3 -c 'import sys;print(sys.version_info[0],sys.version_info[1])')
if (( PY_MAJ < 3 || (PY_MAJ == 3 && PY_MIN < 9) )); then
  echo "error: Python 3.9+ required, found ${PY_MAJ}.${PY_MIN}." >&2; exit 1
fi

# ── 1. Python virtualenv + piper-tts ─────────────────────────────────────────
PIPER_BIN="$VENV_DIR/bin/piper"
if [[ -x "$PIPER_BIN" && $FORCE -eq 0 ]]; then
  log "piper-tts already installed in $VENV_DIR"
else
  log "Creating Python virtualenv in $VENV_DIR"
  rm -rf "$VENV_DIR"
  python3 -m venv "$VENV_DIR" || {
    warn "python3 -m venv failed. On Debian/Ubuntu you may need: sudo apt install python3-venv"
    exit 1
  }

  log "Installing piper-tts (one-time, ~1 min)…"
  "$VENV_DIR/bin/pip" install -q --upgrade pip
  if ! "$VENV_DIR/bin/pip" install -q piper-tts; then
    warn "pip install failed."
    case "$(uname -s)" in
      Darwin) warn "On macOS try: brew install espeak-ng   then re-run ./install.sh" ;;
      Linux)  warn "On Linux try:  sudo apt install -y espeak-ng   (or: dnf install espeak-ng)   then re-run ./install.sh" ;;
    esac
    exit 1
  fi

  [[ -x "$PIPER_BIN" ]] || { echo "error: 'piper' command not found after install." >&2; exit 1; }
  log "piper-tts installed → $PIPER_BIN"
fi

# ── 2. Voice models ──────────────────────────────────────────────────────────
download_serbian
download_piper_voice "$EN_VOICE"

# ── 3. Verify ────────────────────────────────────────────────────────────────
log "Verifying synthesis…"
verify_ok=1
for voice in "$SR_VOICE" "$EN_VOICE"; do
  if echo "test." | "$PIPER_BIN" -m "$MODELS_DIR/$voice.onnx" -c "$MODELS_DIR/$voice.onnx.json" -f /tmp/__tts_verify.wav >/dev/null 2>&1; then
    log "  ok: $voice"
  else
    warn "  verify failed for $voice (the tool may still work)."
    verify_ok=0
  fi
done
rm -f /tmp/__tts_verify.wav
[[ $verify_ok -eq 1 ]] && printf '\033[1;32m==>\033[0m All set.\n\n'

cat <<EOF
  Piper       : $PIPER_BIN
  Serbian     : $MODELS_DIR/$SR_VOICE.onnx
  English     : $MODELS_DIR/$EN_VOICE.onnx

Test it:
  echo "Здраво! Ово је проба." | ./speak.sh            # auto → Serbian
  echo "Hello! This is a test." | ./speak.sh            # auto → English
  ./speak.sh --lang sr "Ћирилица."
  ./speak.sh --lang en "English."
  ./speak.sh --list-voices

Add more voices (any from rhasspy/piper-voices):
  ./install.sh --add-voice en_US-ryan-high
  ./speak.sh --voice en_US-ryan-high "Deeper male voice."

EOF
