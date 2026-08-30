# English TTS Research — Replacing/Upgrading Piper for English

**Date:** 2026-08-30
**Scope:** English only. Serbian stays on Piper (no comparable-quality Serbian model exists at this size).

## Requirements

| Requirement | Notes |
| --- | --- |
| More natural than Piper | "Almost natural" — no expressions/emotion control needed, just really good neutral reading |
| Light + cross-platform | Desktop app (Electron), Windows/macOS/Linux |
| Streaming | Reading must start fast on long text (first audio ASAP, synth while playing) |
| Local/offline preferred | Current design is fully offline (Python sidecar) |

## TL;DR

**Use Kokoro-82M for English.** It is the strongest quality-per-byte local TTS available: 82M params, Apache-2.0, runs several times faster than real-time on a desktop CPU via ONNX Runtime, tops quality rankings in its class (it reached #1 on the HuggingFace TTS Arena leaderboard v1), and has first-class streaming support. Two integration paths:

1. **`kokoro-js` (npm) in the Electron main process** — recommended. No Python for English at all, native streaming API, per-voice files bundled in the package. Serbian keeps the existing Piper sidecar.
2. **`kokoro-onnx` (pip) as a new sidecar** — drop-in mirror of `piper_server.py` using the same frame protocol, if keeping everything in the Python venv is preferred.

## What we have today (verified in repo)

- `resource/script/piper_server.py` — persistent Python sidecar (venv at `bin/venv`), length-prefixed PCM frames over stdio, cancel via `SIGUSR1`.
- `src/main/lib/piper/server.ts` + `tts-service.ts` — frame reader, `audioChunk`/`audioStart`/`audioEnd` events, rate via `length_scale = 1/speed`.
- Voices on disk: `en_US-lessac-medium` (~60MB), `sr_Marko_medium`.
- Streaming today = per-line + per-synthesis-chunk. Works, but Piper (VITS) quality is the ceiling.

Side observation: `signal.SIGUSR1` does not exist on Windows — the current cancel path would crash the sidecar there. The Node-based option below cancels by simply breaking a loop, which is cross-platform for free.

## Recommendation: Kokoro-82M

### What it is

- StyleTTS 2 + ISTFTNet decoder-only architecture, 82M params, 24 kHz output (Piper is 22 kHz).
- Apache-2.0 weights, trained on permissive/non-copyrighted audio (~$1k of A100 time) — clean for commercial shipping.
- v1.0 (Jan 2025) ships 54 voices across 8 languages; **28 English voices** (20 American, 8 British).
- Neutral, natural reading is exactly its strength — no emotion control to configure, which matches our requirement.

### Quality evidence

- Reached **#1 on the TTS Arena leaderboard (v1)** on HuggingFace — noted even by third-party benchmarkers ([Picovoice](https://picovoice.ai/blog/on-device-tts/)).
- Community CPU benchmark of 5 offline models: "best quality still running comfortably on CPU, ~5x real-time" ([r/TextToSpeech](https://www.reddit.com/r/TextToSpeech/comments/1sqkiuc/benchmarked_5_offline_tts_models_on_cpu_short/)).
- Repeatedly ranked the top lightweight pick in 2026 roundups ([BentoML](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models)).

### Performance reality check (be honest with users)

Third-party desktop-CPU benchmark (Ryzen 7 5700X, fp32 341MB model, [Picovoice](https://picovoice.ai/blog/on-device-tts/)):

| Engine | First-time-to-speech | Peak memory | Model size | Core-hour ratio* |
| --- | --- | --- | --- | --- |
| Piper | 1,720 ms | 2.6 GB | 61 MB | 0.35x |
| **Kokoro** | 3,658 ms | 2.0 GB | 341 MB (fp32) | 1.28x |
| Chatterbox-Turbo | 48,281 ms | 7.5 GB | 2,980 MB | 13.4x |

\* single-core; <1.0 = faster than real-time on one core.

Interpretation for our use case:

- Piper is **faster**; Kokoro is **much better sounding**. Both are fine for streaming; Kokoro needs multithreaded ONNX Runtime and/or the int8 model to be comfortably faster than real-time (single-core fp32 is roughly real-time).
- The scary 3.7s "first-time-to-speech" is a **cold** first inference. With a persistent, prewarmed instance (we already do this for Piper) and a short first sentence, perceived start latency is well under a second — sherpa-onnx + Kokoro sentence-level streaming reports first audio in a few hundred ms ([example project](https://huggingface.co/rajarshisomvanshi/Phone-TTS), [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)).
- Use the **q8 ONNX (~86MB)** to cut model size ~4x and reduce peak memory vs fp32; GPU RTF is 0.008 if we ever want a GPU path ([codesota](https://www.codesota.com/guides/tts-models)).

## Integration options

### Option A (recommended): `kokoro-js` in the Electron main process

Package: [`kokoro-js`](https://www.npmjs.com/package/kokoro-js) (v1.2.1) on top of Transformers.js → `onnxruntime-node` (`device: "cpu"`). No Python, no venv, no espeak-ng system dependency for English — phonemization is bundled in JS, and **all 28 English voice tensors ship inside the npm package** (~0.5MB each), so no per-voice download flow is needed.

Verified API (from the shipped type definitions):

```ts
import { KokoroTTS, TextSplitterStream } from 'kokoro-js'

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype: 'q8',              // fp32 | fp16 | q8 | q4 | q4f16
  device: 'cpu',            // onnxruntime-node in the main process
  progress_callback: (p) => { /* wire into the existing download UI */ },
})

// Native streaming — designed for incremental input:
const splitter = new TextSplitterStream()
const stream = tts.stream(splitter, { voice: 'af_heart', speed: 1.0 })
splitter.push(longText)     // or push incrementally, sentence by sentence
splitter.close()

for await (const { text, phonemes, audio } of stream) {
  // audio.sampling_rate === 24000; convert Float32 → Int16 PCM
  // and emit on the existing `audioChunk` / `audioStart` / `audioEnd` events
}
```

Mapping to our codebase:

| Today (Piper) | With kokoro-js |
| --- | --- |
| `piperServerSingleton().ensureReady()` | `KokoroTTS.from_pretrained(...)` kept alive in a singleton; prewarm on app start |
| `synthesize()` + frame reader | `for await (const { audio } of tts.stream(...))` |
| `length_scale = 1/speed` | `speed` directly (no inversion) |
| `SIGUSR1` cancel | `break` the for-await loop (works on Windows too) |
| Per-voice `.onnx` downloads | One model download (~86MB q8); voices bundled in package |

Packaging notes:

- `onnxruntime-node` ships N-API prebuilds (win-x64, darwin-x64/arm64, linux-x64/arm64) — no electron-rebuild needed, but the native `.node` files must be `asarUnpack`-ed in electron-builder.
- By default the model auto-downloads to the Transformers.js cache. To keep our managed `models/` dir + progress UI, download the ONNX files ourselves and point `env.localModelPath` at it (verify local-dir loading for this repo at integration time).
- A working Electron reference exists: [davealaw/kokoro-electron](https://github.com/davealaw/kokoro-electron), plus [Node-process guidance](https://micdrop.dev).

### Option B: `kokoro-onnx` sidecar (keep the Python architecture)

[`kokoro-onnx`](https://github.com/thewh1teagle/kokoro-onnx) (MIT wrapper, Apache-2.0 model) runs on plain `onnxruntime` with the `misaki` G2P for English — no PyTorch, no espeak-ng install for English. `KokoroONNX.create_stream(text, voice, speed, lang='en-us')` yields audio chunks, which maps 1:1 onto our existing frame protocol: clone `piper_server.py` into `kokoro_server.py`, emit the same `READY/AUDIO/END/ERROR` frames, and the TS side stays nearly identical. Costs: keeps the Python venv for English, adds `onnxruntime` to the venv, and inherits the Windows `SIGUSR1` problem.

### Option C (future): sherpa-onnx as a unified runtime

[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) runs **both** Piper voices and Kokoro, cross-platform incl. mobile, with sentence-level streaming. Could eventually replace the Python sidecar for Serbian too (same `.onnx` voice files), but its Node bindings are less mature than `kokoro-js` — not worth it until we want one runtime for everything.

## English voices to expose (from the model card grades)

| Voice | Gender | Accent | Grade |
| --- | --- | --- | --- |
| `af_heart` | F | US | **A** |
| `af_bella` | F | US | A- |
| `af_nicole` | F | US | B- (headphone-tuned, breathy) |
| `bf_emma` | F | UK | B- |
| `am_michael` / `am_fenrir` / `am_puck` | M | US | C+ |
| `bm_george` / `bm_fable` | M | UK | C |

Female US voices are Kokoro's strongest; male voices are usable but a grade lower. Ship `af_heart` as the default and expose the rest in Settings.

## Alternatives considered (and why not)

| Option | Verdict |
| --- | --- |
| **Qwen3-TTS** (0.6B/1.7B, Apache-2.0, Jan 2026) | Best open quality overall + voice cloning, but needs ~6GB+ VRAM — not "light", not CPU-class |
| **Orpheus-3B** | Excellent naturalness, streaming-first design, but 3B LLM-based → GPU-class |
| **Chatterbox** (Resemble) | Good quality, but 48s first-audio / 7.5GB peak on CPU — non-starter |
| **Sesame CSM-1B / VibeVoice 1.5B / F5-TTS / Dia** | All GPU-class; F5 also has slow CPU inference |
| **Supertonic 3** | Faster than Kokoro on CPU, quality slightly below — worth re-evaluating in a year |
| **KittenTTS** | Tiny (42MB) but measured slower than Kokoro on CPU and lower quality |
| **MeloTTS** | Light and CPU-friendly, but below Kokoro in naturalness |
| **Cloud (ElevenLabs, OpenAI `gpt-4o-mini-tts`, Deepgram Aura-2, Cartesia Sonic)** | Best-in-class naturalness + true token streaming, but network/key/cost/privacy — contradicts the offline-first design. Worth offering only as an opt-in later |
| **Staying on Piper** | Fastest and smallest, but VITS quality ceiling is exactly the problem being solved |

## Gotchas

- **Warm-up:** first inference after load is slow (the 3.7s cold number). Keep the model resident (singleton + prewarm), same strategy as today's Piper server.
- **Memory:** plan for ~1–2GB peak during synthesis (fp32); q8 reduces it. Piper needs less — if a user's machine is constrained, Piper can remain the fallback engine.
- **Chunk stitching:** Kokoro emits per-sentence audio; trim/handle the ~0.3s leading-silence-per-chunk artifact reported in [sherpa-onnx#1866](https://github.com/k2-fsa/sherpa-onnx/issues/1866) if it's audible in practice.
- **dtype:** `q8` is the sweet spot; `q4` exists but audibly degrades. A/B `fp32` vs `q8` on `af_heart` before deciding.
- ** Serbian untouched:** Kokoro has no Serbian; keep `sr_Marko_medium` on the existing Piper path.

## Sources

- [hexgrad/Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M) — architecture, license, training data, releases
- [kokoro-js on npm](https://www.npmjs.com/package/kokoro-js) — API, streaming, voices, dtypes
- [thewh1teagle/kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) — Python ONNX wrapper, model sizes
- [Picovoice on-device TTS benchmark](https://picovoice.ai/blog/on-device-tts/) — FTTS/memory/size table (Ryzen 7 5700X)
- [r/TextToSpeech CPU benchmark of 5 offline models](https://www.reddit.com/r/TextToSpeech/comments/1sqkiuc/benchmarked_5_offline_tts_models_on_cpu_short/)
- [BentoML: Best Open-Source TTS in 2026](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models)
- [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) — sizes/license/VRAM
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) · [sherpa-onnx#1866](https://github.com/k2-fsa/sherpa-onnx/issues/1866) — runtime options, chunk-silence issue
- [davealaw/kokoro-electron](https://github.com/davealaw/kokoro-electron) — Electron + kokoro-js reference app
- [Phone-TTS (Kokoro + sherpa-onnx sentence streaming)](https://huggingface.co/rajarshisomvanshi/Phone-TTS)
- [codesota TTS model comparison](https://www.codesota.com/guides/tts-models) · [HeyNeo: Kokoro vs Supertonic on CPU](https://heyneo.com/blog/kokoro-tts-vs-supertonic-3-tts)
