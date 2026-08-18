import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import iconUrl from '#src/renderer/src/asset/icon.png'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { Settings } from '#src/shared/types'

export function AboutSettings(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    void api.getSettings().then(setSettings)
  }, [])

  const bindingList = getBindingList({ settings })

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
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
        <a
          className="text-logo-primary hover:underline"
          href="https://github.com/rhasspy/piper"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          Piper TTS engine
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://huggingface.co/rhasspy/piper-voices"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          rhasspy/piper-voices (English + more)
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://huggingface.co/phantom9623/piper-serbian-tts"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          phantom9623/piper-serbian-tts (Serbian voice)
        </a>
        <a
          className="text-logo-primary hover:underline"
          href="https://handy.computer"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          Handy — the dictation app this UI takes after
        </a>
      </section>
    </div>
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
