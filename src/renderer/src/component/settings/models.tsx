import { useEffect, useMemo, useState } from 'react'
import { Download, Search, AlertTriangle, RefreshCw } from 'lucide-react'
import { useModelsStore } from '@src/renderer/src/store/models'
import { ModelCard } from '@src/renderer/src/component/ui/model-card'
import { DownloadRow } from '@src/renderer/src/component/ui/download-row'
import { DownloadModels } from '@src/renderer/src/component/settings/download-models'

export function ModelsSettings(): React.JSX.Element {
  const {
    voices,
    isEngineInstalled,
    isInstalling,
    logs,
    progress,
    load,
    installEngine,
    remove
  } = useModelsStore()

  const [query, setQuery] = useState('')
  const [view, setView] = useState<'installed' | 'download'>('installed')

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return voices
    }
    return voices.filter((v) => {
      return v.name.toLowerCase().includes(q)
    })
  }, [voices, query])

  const downloadingNames = Object.keys(progress)
  const downloadingRows = useMemo(() => {
    return downloadingNames.map((name) => {
      return { name, progress: progress[name] }
    })
  }, [downloadingNames, progress])

  if (view === 'download') {
    return (
      <DownloadModels
        onBack={() => {
          setView('installed')
        }}
      />
    )
  }

  const installButtonIcon = getInstallButtonIcon({ isInstalling })
  const installButtonLabel = getInstallButtonLabel({ isInstalling })
  const installedCountLabel = getInstalledCountLabel({ count: voices.length })
  const voiceList = getVoiceList({ filtered, voices, query, remove })

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Models</h1>
          <button
            type="button"
            onClick={() => {
              setView('download')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke"
          >
            <Download size={14} /> Download voices
          </button>
        </div>
        <p className="text-sm text-text/55 mt-1">
          Voices are stored in <code className="text-xs">models/</code>. Browse the catalog or add any
          Piper voice.
        </p>
      </header>

      {!isEngineInstalled && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Piper engine not found</p>
              <p className="text-xs text-text/60 mt-1">
                Install the Piper engine — it creates a private virtualenv (Python <code>piper-tts</code>)
                and downloads the default Serbian and English voices.
              </p>
              <button
                type="button"
                disabled={isInstalling}
                onClick={() => {
                  installEngine()
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

      {downloadingRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text/60 px-1">Downloading</h2>
          {downloadingRows.map((d) => (
            <DownloadRow key={d.name} name={d.name} progress={d.progress} />
          ))}
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
    </div>
  )

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
      return `(${params.count})`
    }
    return ''
  }

  function getVoiceList(params: {
    filtered: typeof voices
    voices: typeof voices
    query: string
    remove: (name: string) => Promise<void>
  }): React.JSX.Element {
    if (params.filtered.length === 0) {
      return (
        <p className="text-sm text-text/50 px-1 py-6 text-center">
          {getEmptyVoicesMessage({ voices: params.voices })}
        </p>
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
                void params.remove(voice.name)
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
