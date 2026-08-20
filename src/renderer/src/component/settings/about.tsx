import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import iconUrl from '#src/renderer/src/asset/icon.png'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { Settings } from '#src/shared/types'

const credits = [
  { label: 'Piper TTS engine (piper-tts, GPL-3.0)', url: 'https://github.com/OHF-voice/piper1-gpl' },
  { label: 'rhasspy/piper-voices (English + more)', url: 'https://huggingface.co/rhasspy/piper-voices' },
  {
    label: 'phantom9623/piper-serbian-tts (Serbian voice)',
    url: 'https://huggingface.co/phantom9623/piper-serbian-tts',
  },
  { label: 'eSpeak NG (phonemization)', url: 'https://github.com/espeak-ng/espeak-ng' },
  { label: 'tinyld (language auto-detection)', url: 'https://github.com/komodojp/tinyld' },
  { label: 'Handy — the dictation app that inspired this app', url: 'https://handy.computer' },
]

export function AboutSettings(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    void api.getSettings().then(setSettings)
  }, [])

  const bindingList = getBindingList({ settings })

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">About</h1>
        <p className="text-sm text-text/55 mt-1">On-device text-to-speech, inspired by Handy.</p>
      </header>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={iconUrl} alt="" className="h-10 w-10 rounded-xl" draggable={false} />
          <div>
            <div className="text-base font-semibold">Text Lantern</div>
            <div className="text-xs text-text/55">Version 0.1.0 · MVP</div>
          </div>
        </div>
        <p className="text-sm text-text/70 leading-relaxed">
          Press a global shortcut to read the selected text aloud with neural Piper voices. Everything runs on your
          device — nothing is sent anywhere. Language is auto-detected from the text or chosen via a per-language
          shortcut.
        </p>
        {bindingList}
      </section>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-2 text-sm">
        <h2 className="text-sm font-semibold mb-1">Credits</h2>
        {credits.map((credit) => {
          return (
            <a
              key={credit.url}
              className="text-logo-primary hover:underline"
              href={credit.url}
              rel="noreferrer"
              target="_blank"
            >
              {credit.label}
            </a>
          )
        })}
      </section>
    </SettingsPage>
  )

  function getBindingList(params: { settings: Settings | null }): React.JSX.Element | null {
    if (!params.settings || params.settings.languageBindings.length === 0) {
      return null
    }

    return (
      <div className="text-xs text-text/55 mt-1">
        {params.settings.languageBindings.map((binding, index) => {
          return (
            <span key={binding.id}>
              {getSeparator({ index })}
              {languageCatalogSingleton().getDisplayName({ code: binding.langCode })}:{' '}
              <span className="selectable">{binding.voice}</span>
            </span>
          )
        })}
      </div>
    )
  }

  function getSeparator(params: { index: number }): string {
    if (params.index > 0) {
      return ' · '
    }

    return ''
  }
}
