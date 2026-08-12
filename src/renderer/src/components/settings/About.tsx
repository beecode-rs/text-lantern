import { useEffect, useState } from 'react'
import { api } from '../../api'

export function AboutSettings(): React.JSX.Element {
  const [voices, setVoices] = useState<{ sr: string; en: string } | null>(null)
  useEffect(() => {
    api.getSettings().then((s) => setVoices({ sr: s.voiceSr, en: s.voiceEn }))
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">About</h1>
        <p className="text-sm text-text/55 mt-1">On-device text-to-speech, inspired by Handy.</p>
      </header>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-logo-primary text-logo-stroke text-lg font-bold">
            R
          </span>
          <div>
            <div className="text-base font-semibold">TTS Reader</div>
            <div className="text-xs text-text/55">Version 0.1.0 · MVP</div>
          </div>
        </div>
        <p className="text-sm text-text/70 leading-relaxed">
          Press a global shortcut to read the selected text aloud with neural Piper voices. Everything
          runs on your device — nothing is sent anywhere. Language is auto-detected (Cyrillic or Serbian
          diacritics → Serbian, otherwise English) or chosen per shortcut.
        </p>
        {voices && (
          <div className="text-xs text-text/55 mt-1">
            Serbian: <span className="selectable">{voices.sr}</span> · English:{' '}
            <span className="selectable">{voices.en}</span>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-2 text-sm">
        <h2 className="text-sm font-semibold mb-1">Credits</h2>
        <a
          className="text-logo-primary hover:underline"
          href="https://github.com/rhasspy/piper"
          onClick={(e) => e.preventDefault()}
        >
          Piper TTS engine
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://huggingface.co/rhasspy/piper-voices"
          onClick={(e) => e.preventDefault()}
        >
          rhasspy/piper-voices (English + more)
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://huggingface.co/phantom9623/piper-serbian-tts"
          onClick={(e) => e.preventDefault()}
        >
          phantom9623/piper-serbian-tts (Serbian voice)
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://handy.computer"
          onClick={(e) => e.preventDefault()}
        >
          Handy — the dictation app this UI takes after
        </a>
      </section>
    </div>
  )
}
