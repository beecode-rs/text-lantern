import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { ModelCard } from '#src/renderer/src/component/ui/model-card'
import { useModelsStore } from '#src/renderer/src/store/models'
import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export function ModelsTabInstalled(): React.JSX.Element {
  const { voices, remove } = useModelsStore()

  const [query, setQuery] = useState('')
  const [pendingDeleteVoiceId, setPendingDeleteVoiceId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return voices
    }

    return voices.filter((v) => {
      return v.name.toLowerCase().includes(q)
    })
  }, [voices, query])

  const installedCountLabel = getInstalledCountLabel({ count: voices.length })
  const voiceList = getVoiceList({ filtered, onRequestDelete: setPendingDeleteVoiceId, voices })

  return (
    <>
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

      {pendingDeleteVoiceId !== null && (
        <ConfirmDialog
          title="Delete voice"
          message={getDeleteMessage({ id: pendingDeleteVoiceId })}
          onConfirm={() => {
            void remove(pendingDeleteVoiceId)
            setPendingDeleteVoiceId(null)
          }}
          onCancel={() => {
            setPendingDeleteVoiceId(null)
          }}
        />
      )}
    </>
  )

  function getInstalledCountLabel(params: { count: number }): string {
    if (params.count > 0) {
      return `(${String(params.count)})`
    }

    return ''
  }

  function getVoiceList(params: {
    filtered: typeof voices
    voices: typeof voices
    onRequestDelete: (id: string) => void
  }): React.JSX.Element {
    if (params.filtered.length === 0) {
      return (
        <p className="text-sm text-text/50 px-1 py-6 text-center">{getEmptyVoicesMessage({ voices: params.voices })}</p>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {params.filtered.map((voice) => {
          const id = voiceIdParser.build({ name: voice.name, provider: voice.provider })

          return (
            <ModelCard
              key={id}
              voice={voice}
              onDelete={() => {
                params.onRequestDelete(id)
              }}
            />
          )
        })}
      </div>
    )
  }

  function getDeleteMessage(params: { id: string }): string {
    const { name, provider } = voiceIdParser.parse({ id: params.id })
    if (provider === TtsProvider.COSYVOICE) {
      return `Delete "${name}" from your device? This voice was cloned from your reference audio and cannot be re-downloaded. This cannot be undone.`
    }

    return `Delete "${name}" from your device? The voice files will be removed. You can download it again later.`
  }

  function getEmptyVoicesMessage(params: { voices: typeof voices }): string {
    if (params.voices.length === 0) {
      return 'No voices yet — pick a provider to download one.'
    }

    return 'No voices match your filter.'
  }
}
