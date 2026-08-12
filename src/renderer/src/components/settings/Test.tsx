import { useEffect, useMemo, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useSettingsStore } from '@src/renderer/src/store/settings'
import { useModelsStore } from '@src/renderer/src/store/models'
import { useTestStore } from '@src/renderer/src/store/test'
import { SettingsGroup } from '@src/renderer/src/components/ui/SettingsGroup'
import { ttsLanguageName } from '@src/shared/languages'
import { api } from '@src/renderer/src/api'
import type { TtsStatus } from '@src/shared/types'

export function TestSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => { return s.settings })
  const voices = useModelsStore((s) => { return s.voices })
  const loadModels = useModelsStore((s) => { return s.load })
  const selectedLang = useTestStore((s) => { return s.selectedLang })
  const text = useTestStore((s) => { return s.text })
  const setLang = useTestStore((s) => { return s.setLang })
  const setText = useTestStore((s) => { return s.setText })

  const [status, setStatus] = useState<TtsStatus>({ state: 'idle' })

  useEffect(() => { loadModels() }, [loadModels])

  useEffect(() => {
    return api.onTtsStatus(setStatus)
  }, [])

  const connectedBindings = useMemo(() => {
    if (!settings) { return [] }
    return settings.languageBindings.filter((binding) => {
      return voices.some((voice) => { return voice.name === binding.voice })
    })
  }, [settings, voices])

  const activeLang = useMemo(() => {
    if (connectedBindings.length === 0) { return '' }
    if (selectedLang === 'auto') { return 'auto' }
    const currentValid = connectedBindings.some((binding) => {
      return binding.langCode === selectedLang
    })
    if (currentValid) { return selectedLang }
    const english = connectedBindings.find((binding) => { return binding.langCode === 'en' })
    return (english ?? connectedBindings[0]).langCode
  }, [connectedBindings, selectedLang])

  if (!settings) {
    return <></>
  }

  const hasConnected = connectedBindings.length > 0
  const busy = status.state === 'synthesizing' || status.state === 'reading'
  const canSpeak = hasConnected && text.trim().length > 0 && activeLang !== ''

  const fallbackBinding = settings.languageBindings.find((binding) => {
    return binding.langCode === settings.fallbackLang
  })
  const fallbackVoiceConnected = fallbackBinding !== undefined
    && voices.some((voice) => { return voice.name === fallbackBinding.voice })
  const autoLabel = fallbackVoiceConnected && fallbackBinding
    ? `Auto-detect · ${fallbackBinding.voice}`
    : `Auto-detect · fallback: ${ttsLanguageName({ code: settings.fallbackLang })}`

  const onButtonClick = (): void => {
    if (busy) {
      void api.stop()
      return
    }
    if (canSpeak) {
      void api.speak(activeLang, text)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">Test</h1>
        <p className="text-sm text-text/55 mt-1">
          Hear a connected voice. Pick a language, edit the text, and speak it.
        </p>
      </header>

      {!hasConnected ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <Volume2 size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-text/70">
            No language is connected to a downloaded voice yet. Download a voice in{' '}
            <strong>Models</strong>, pair it with a language in <strong>Languages</strong>, then
            return here to test it.
          </div>
        </div>
      ) : (
        <SettingsGroup
          title="Voice"
          description="Uses the voice bound to each language under Languages."
        >
          <div className="px-4 py-3 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-text/55">Language</span>
              <select
                value={activeLang}
                onChange={(e) => { return setLang(e.target.value) }}
                disabled={busy}
                className="px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:opacity-60"
              >
                <option value="auto">{autoLabel}</option>
                {connectedBindings.map((binding) => {
                  return (
                    <option key={binding.id} value={binding.langCode}>
                      {ttsLanguageName({ code: binding.langCode })} · {binding.voice}
                    </option>
                  )
                })}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-text/55">Text</span>
              <textarea
                value={text}
                onChange={(e) => { return setText(e.target.value) }}
                disabled={busy}
                rows={4}
                className="px-3 py-2 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary resize-none disabled:opacity-60"
              />
            </label>

            <div>
              <button
                type="button"
                onClick={onButtonClick}
                disabled={!busy && !canSpeak}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
              >
                {busy ? <Square size={13} className="fill-current" /> : <Volume2 size={14} />}
                {busy ? 'Stop' : 'Speak'}
              </button>
            </div>
          </div>
        </SettingsGroup>
      )}
    </div>
  )
}
