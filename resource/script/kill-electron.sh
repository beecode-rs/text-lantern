#!/usr/bin/env bash
#
# kill-electron.sh — find and terminate every Electron process launched from
# this project (Text Lantern / formerly tts-reader), including all of its
# helper children (renderer, GPU, network, audio, …).
#
# Because `electron-vite dev` respawns the app the instant it dies, the script
# also stops the repo-local spawner by default so the kill actually sticks.
#
# Usage:
#   ./kill-electron.sh                  list + kill Electron and its spawner
#   ./kill-electron.sh --list           list only, kill nothing (dry run)
#   ./kill-electron.sh --force          skip SIGTERM, kill -9 immediately
#   ./kill-electron.sh --electron-only  leave the electron-vite watcher running
#   ./kill-electron.sh -h               show this help
#
# Safety: only processes whose executable points inside this repo's
# node_modules/electron are targeted, plus this repo's own electron-vite
# launcher. Other Electron apps on the machine (Claude, Docker, Discord, …)
# and other projects' dev servers are left untouched.

set -u

# --- locate the project root from this script's own path -------------------
# This script lives at <root>/resource/script/, so the root is two levels up.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ELECTRON_APP_DIR="$PROJECT_ROOT/node_modules/electron/dist/Electron.app"
VITE_LAUNCHER="$PROJECT_ROOT/node_modules/.bin/electron-vite"

# --- parse flags -----------------------------------------------------------
SPAWNERS="yes"   # yes | no
MODE="kill"      # kill | list
SIGNAL="TERM"    # TERM | KILL
for arg in "$@"; do
  case "$arg" in
    -l|--list)            MODE="list" ;;
    -9|--force)           SIGNAL="KILL" ;;
    --electron-only)      SPAWNERS="no" ;;
    -h|--help)            sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# `ps -ww` gives the full, untruncated command line on macOS.
PS_FULL() { ps -ww -ax -o pid=,command=; }

# Read newline-separated stdin into a global array named by $1, in the
# CURRENT shell. (A pipe would run this in a subshell and lose the result, so
# callers must feed it via process substitution: `... < <(collect)`.)
read_into() {
  local _name="$1" _line; eval "$_name=()"
  while IFS= read -r _line; do eval "$_name+=(\"\$_line\")"; done
}

# --- matchers --------------------------------------------------------------
# Electron procs: anchor on the first command token (the executable) so that
# grep/awk/ps subprocesses whose argv merely *mentions* the path are not
# mistaken for Electron. Field 1 = pid, field 2 = executable, rest = args.
collect_electron_pids() {
  PS_FULL | awk -v app="$ELECTRON_APP_DIR" '$2 ~ app { print $1 }'
}

# Repo-local spawner: a `node` process whose argv contains this repo's
# electron-vite launcher path (i.e. `node <repo>/.bin/electron-vite dev`).
# Anchoring on the node executable excludes our own awk matcher.
collect_spawner_pids() {
  ps -ww -ax -o pid=,command= \
    | awk -v pat="$VITE_LAUNCHER" '
        function basename(p,   a,n) { n = split(p, a, "/"); return a[n] }
        basename($2) == "node" {
          for (i = 3; i <= NF; i++) if ($i == pat) { print $1; break }
        }
      '
}

describe() {
  echo "Electron processes:"
  PS_FULL | awk -v app="$ELECTRON_APP_DIR" '
    $2 ~ app {
      pid = $1; type = "(main)"; ud = ""
      for (i = 3; i <= NF; i++) {
        if ($i ~ /^--type=/) type = $i
        if ($i ~ /^--user-data-dir=/) {
          ud = $i
          # the path can contain spaces, so keep gathering until the next flag
          for (j = i + 1; j <= NF && $j !~ /^--/; j++) ud = ud " " $j
        }
      }
      sub(/^--type=/, "", type)
      sub(/^.*--user-data-dir=/, "", ud)
      nb = split(ud, seg, "/"); ud = seg[nb]   # profile name (last path segment)
      printf "  %-7s %-22s %s\n", pid, type, ud
    }'
  if [ "$SPAWNERS" = "yes" ]; then
    echo "Spawner (electron-vite):"
    if [ "${#S_PIDS[@]}" -gt 0 ]; then
      for pid in "${S_PIDS[@]}"; do
        printf "  %-7s %s\n" "$pid" "$(ps -ww -p "$pid" -o command=)"
      done
    else
      echo "  (none)"
    fi
  fi
}

# --- gather (current shell, via process substitution) ----------------------
E_PIDS=(); while IFS= read -r _p; do E_PIDS+=("$_p"); done < <(collect_electron_pids)
S_PIDS=(); while IFS= read -r _p; do S_PIDS+=("$_p"); done < <(collect_spawner_pids)

if [ "${#E_PIDS[@]}" -eq 0 ]; then
  if [ "$SPAWNERS" = "no" ] || [ "${#S_PIDS[@]}" -eq 0 ]; then
    echo "No Electron processes found for:"
    echo "  $PROJECT_ROOT"
    exit 0
  fi
fi

echo "Project: $PROJECT_ROOT"
describe

if [ "$MODE" = "list" ]; then
  echo
  echo "(dry run — nothing was killed)"
  exit 0
fi

# --- kill ------------------------------------------------------------------
echo

# Stop the spawner FIRST so it cannot relaunch Electron underneath us.
if [ "$SPAWNERS" = "yes" ] && [ "${#S_PIDS[@]}" -gt 0 ]; then
  echo "Stopping spawner (${#S_PIDS[@]}): ${S_PIDS[*]}"
  kill -s "$SIGNAL" "${S_PIDS[@]}" 2>/dev/null || true
  [ "$SIGNAL" = "TERM" ] && sleep 1
fi

# Now the Electron tree. Re-collect, because the spawner may have just spawned.
E_PIDS=(); while IFS= read -r _p; do E_PIDS+=("$_p"); done < <(collect_electron_pids)
if [ "${#E_PIDS[@]}" -gt 0 ]; then
  echo "Stopping Electron (${#E_PIDS[@]}): ${E_PIDS[*]}"
  kill -s "$SIGNAL" "${E_PIDS[@]}" 2>/dev/null || true
  [ "$SIGNAL" = "TERM" ] && sleep 1
fi

# Escalate: SIGKILL anything still alive (Electron or spawner).
LEFT=()
while IFS= read -r _p; do LEFT+=("$_p"); done < \
  <({ [ "$SPAWNERS" = "yes" ] && collect_spawner_pids; collect_electron_pids; } | sort -u)
if [ "${#LEFT[@]}" -gt 0 ]; then
  echo "Escalating to SIGKILL (${#LEFT[@]}): ${LEFT[*]}"
  kill -9 "${LEFT[@]}" 2>/dev/null || true
  sleep 1
fi

# --- report ----------------------------------------------------------------
LEFT=()
while IFS= read -r _p; do LEFT+=("$_p"); done < \
  <({ [ "$SPAWNERS" = "yes" ] && collect_spawner_pids; collect_electron_pids; } | sort -u)
if [ "${#LEFT[@]}" -eq 0 ]; then
  echo "Done — all terminated."
else
  echo "Warning: ${#LEFT[@]} process(es) still running:" >&2
  describe >&2
  exit 1
fi
