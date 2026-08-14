# stream-player

- **Path:** `src/renderer/src/lib/stream-player.ts`
- **Layer:** Lib
- **Process:** renderer
- **Lines:** 109

## What this file is for
A renderer-side Web Audio player that turns a stream of raw 16-bit PCM chunks (delivered by the main TTS pipeline via IPC) into scheduled, gapless audio playback. It owns an `AudioContext` + `GainNode`, converts `Uint8Array` samples into `Float32` `AudioBuffer`s, tracks active `AudioBufferSourceNode`s, and fires an `onDone` callback once the final buffer finishes. Used solely by the `NowPlaying` component, which instantiates one `StreamPlayer` per mount.

## Layer & placement assessment
- **Right layer?** Yes. The architecture doc explicitly lists `stream-player` under renderer `lib/` (helpers/hooks, no JSX), and this file contains zero JSX and no React imports.
- **Right process boundary?** Yes. Uses only browser Web Audio APIs (`AudioContext`, `GainNode`, `AudioBufferSourceNode`); correctly confined to the renderer, no Electron/IPC/Node touchpoints.
- **Dependency direction ok?** Yes. The file imports nothing. Its sole consumer is `components/NowPlaying.tsx`, i.e. `components → lib`, which is the allowed direction.
- **Folder naming (singular rule):** OK. Lives under singular `lib/`.
- **File naming:** OK. `kebab-case` `stream-player.ts`; `.ts` (no JSX) is correct. The `-service` suffix rule applies to main-process service singletons, not renderer lib classes, so no suffix is expected.

## Notes / concerns
- Export shape is clean: a class is exported and instantiated at the call site (`new StreamPlayer()`), consistent with the no-exported-instances rule.
- Minor inconsistency vs. the object-params convention: `start()` uses object params, but `feed(samples: Uint8Array)`, `end()`, and `stop()` use positional/no params. Acceptable for a low-level renderer utility, but normalizing would be tidier.
- The empty `catch {}` around `source.stop()` (line 78) silently swallows the "already stopped" throw — intentional and harmless, but a one-line comment-free guard (e.g. checking `source.state`) would make the intent self-evident.
