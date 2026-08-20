import { AlertTriangle, Download, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { ModelCard } from '#src/renderer/src/component/ui/model-card'
import { useModelsStore } from '#src/renderer/src/store/models'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import { DEFAULT_VOICE_OPTIONS } from '#src/shared/voice/default-voice'

export function ModelsTabInstalled(): React.JSX.Element {
  const { voices, isEngineInstalled, isInstalling, logs, installEngine, remove } = useModelsStore()

  const [query, setQuery] = useState('')
  const [pendingDeleteVoiceName, setPendingDeleteVoiceName] = useState<string | null>(null)
  const [selectedVoiceNames, setSelectedVoiceNames] = useState<string[]>(() => {
    return DEFAULT_VOICE_OPTIONS.map((option) => {
      return option.voiceName
    })
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return voices
    }

    return voices.filter((v) => {
      return v.name.toLowerCase().includes(q)
    })
  }, [voices, query])

  const installButtonIcon = getInstallButtonIcon({ isInstalling })
  const installButtonLabel = getInstallButtonLabel({ isInstalling })
  const installedCountLabel = getInstalledCountLabel({ count: voices.length })
  const voiceList = getVoiceList({ filtered, onRequestDelete: setPendingDeleteVoiceName, voices })

  return (
    <>
      {!isEngineInstalled && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Piper engine not found</p>
              <p className="text-xs text-text/60 mt-1">
                Install the Piper engine — it creates a private virtualenv (Python <code>piper-tts</code>) and downloads
                the selected default voices.
              </p>
              {getDefaultVoiceCheckboxes({
                isInstalling,
                onToggle: toggleVoiceSelected,
                selectedVoiceNames,
              })}
              <button
                type="button"
                disabled={isInstalling}
                onClick={() => {
                  void installEngine(selectedVoiceNames)
                }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
              >
                {installButtonIcon}
                {installButtonLabel}
              </button>
              {logs.length > 0 && (
                <pre className="selectable mt-3 text-[11px] leading-relaxed text-text/65 bg-mid-gray/10 rounded-lg p-2 max-h-40 overflow-auto whitespace-pre-wrap">
                  {logs.join('\n')}
                </pre>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-text/60">Installed {installedCountLabel}</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text/40" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder="Filter"
              className="pl-7 pr-2 py-1 text-xs rounded-md border border-mid-gray/40 bg-mid-gray/10 w-40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
            />
          </div>
        </div>

        {voiceList}
      </section>

      {pendingDeleteVoiceName !== null && (
        <ConfirmDialog
          title="Delete voice"
          message={`Delete "${pendingDeleteVoiceName}" from your device? The voice files will be removed. You can download it again later.`}
          onConfirm={() => {
            void remove(pendingDeleteVoiceName)
            setPendingDeleteVoiceName(null)
          }}
          onCancel={() => {
            setPendingDeleteVoiceName(null)
          }}
        />
      )}
    </>
  )

  function toggleVoiceSelected(voiceName: string): void {
    setSelectedVoiceNames((prev) => {
      if (prev.includes(voiceName)) {
        return prev.filter((name) => {
          return name !== voiceName
        })
      }

      return [...prev, voiceName]
    })
  }

  function getDefaultVoiceCheckboxes(params: {
    selectedVoiceNames: string[]
    isInstalling: boolean
    onToggle: (voiceName: string) => void
  }): React.JSX.Element {
    return (
      <div className="mt-3 flex flex-col gap-1.5">
        {DEFAULT_VOICE_OPTIONS.map((option) => {
          return (
            <label key={option.voiceName} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={params.selectedVoiceNames.includes(option.voiceName)}
                disabled={params.isInstalling}
                onChange={() => {
                  params.onToggle(option.voiceName)
                }}
                className="h-3.5 w-3.5 accent-logo-primary"
              />
              <span>{languageCatalogSingleton().getDisplayName({ code: option.langCode })}</span>
              <code className="text-[11px] text-text/55 selectable">{option.voiceName}</code>
            </label>
          )
        })}
      </div>
    )
  }

  function getInstallButtonIcon(params: { isInstalling: boolean }): React.JSX.Element {
    if (params.isInstalling) {
      return <RefreshCw size={14} className="animate-spin" />
    }

    return <Download size={14} />
  }

  function getInstallButtonLabel(params: { isInstalling: boolean }): string {
    if (params.isInstalling) {
      return 'Installing…'
    }

    return 'Install engine'
  }

  function getInstalledCountLabel(params: { count: number }): string {
    if (params.count > 0) {
      return `(${String(params.count)})`
    }

    return ''
  }

  function getVoiceList(params: {
    filtered: typeof voices
    voices: typeof voices
    onRequestDelete: (name: string) => void
  }): React.JSX.Element {
    if (params.filtered.length === 0) {
      return (
        <p className="text-sm text-text/50 px-1 py-6 text-center">{getEmptyVoicesMessage({ voices: params.voices })}</p>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {params.filtered.map((voice) => {
          return (
            <ModelCard
              key={voice.name}
              voice={voice}
              onDelete={() => {
                params.onRequestDelete(voice.name)
              }}
            />
          )
        })}
      </div>
    )
  }

  function getEmptyVoicesMessage(params: { voices: typeof voices }): string {
    if (params.voices.length === 0) {
      return 'No voices yet — download one to get started.'
    }

    return 'No voices match your filter.'
  }
}
