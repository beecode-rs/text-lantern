# NowPlaying

- **Path:** `src/renderer/src/components/NowPlaying.tsx`
- **Layer:** Component
- **Process:** renderer
- **Lines:** 85

## What this file is for
Renders the bottom "now playing" status bar that surfaces TTS playback state (`idle`/`synthesizing`/`reading`/`error`) with a Stop button. It subscribes to renderer IPC audio events (status, audio start/chunk/end, stop) through `api` and feeds PCM chunks into a `StreamPlayer` that plays them via the AudioContext. It owns no business rules — it is glue between the IPC stream and the audio player, plus presentational markup.

## Layer & placement assessment
- **Right layer?** Yes — a feature component that belongs in the renderer `components/` folder.
- **Right process boundary?** Yes — only renderer-side imports (React, `lucide-react`, renderer `api` and `lib`, shared types); no `ipcRenderer`, `main`, or native imports leak in.
- **Dependency direction ok?** Yes — component → `lib/stream-player` → shared types; nothing here imports a store or component upward.
- **Folder naming (singular rule):** VIOLATION — lives under plural `components`; CLAUDE.md requires singular (`component`).
- **File naming:** NOTE — PascalCase `NowPlaying.tsx`; writing-clean-ts expects kebab-case `now-playing.tsx` for UI components (the `NowPlaying` export stays PascalCase).

## Notes / concerns
- Minor nit (not a layer issue): the `playerRef.current` null-check is a hand-rolled lazy singleton; `useState(() => new StreamPlayer())` would express the same intent more conventionally.
- Component renders nothing while `idle` (empty fragment) — fine, matches its "show only while busy/error" contract.
