import { useEffect, useMemo, useState } from 'react'
import { Download, Search, AlertTriangle, RefreshCw } from 'lucide-react'
import { useModelsStore } from '@src/renderer/src/store/models'
import { ModelCard, DownloadRow } from '@src/renderer/src/components/ui/ModelCard'

export function ModelsSettings(): React.JSX.Element {
  const {
    voices,
    engineInstalled,
    installing,
    logs,
    progress,
    load,
    installEngine,
    download,
    remove
  } = useModelsStore()

  const [query, setQuery] = useState('')
  const [addName, setAddName] = useState('')

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return voices
    return voices.filter((v) => v.name.toLowerCase().includes(q))
  }, [voices, query])

  const downloadingNames = Object.keys(progress)
  const downloadingRows = useMemo(
    () => downloadingNames.map((name) => ({ name, progress: progress[name] })),
    [downloadingNames, progress]
  )

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-text/55 mt-1">
          Voices are stored in <code className="text-xs">models/</code>. Download defaults or add any
          Piper voice.
        </p>
      </header>

      {!engineInstalled && (
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
                disabled={installing}
                onClick={() => installEngine()}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
              >
                {installing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                {installing ? 'Installing…' : 'Install engine'}
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
        <div className="flex gap-2">
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && addName.trim()) {
                void download(addName.trim())
                setAddName('')
              }
            }}
            placeholder="Add a voice, e.g. en_US-ryan-high"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
          />
          <button
            type="button"
            disabled={!addName.trim()}
            onClick={() => {
              if (addName.trim()) {
                void download(addName.trim())
                setAddName('')
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
          >
            <Download size={14} /> Download
          </button>
        </div>
        <p className="text-xs text-text/50">
          Any voice from{' '}
          <span className="selectable">rhasspy/piper-voices</span> by name, e.g.{' '}
          <span className="selectable">en_GB-cori-high</span>. The Serbian voice is{' '}
          <span className="selectable">sr_Marko_medium</span>.
        </p>
      </section>

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
          <h2 className="text-sm font-medium text-text/60">
            Installed {voices.length > 0 && `(${voices.length})`}
          </h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter"
              className="pl-7 pr-2 py-1 text-xs rounded-md border border-mid-gray/40 bg-mid-gray/10 w-40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-text/50 px-1 py-6 text-center">
            {voices.length === 0 ? 'No voices yet — add one above.' : 'No voices match your filter.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((voice) => (
              <ModelCard
                key={voice.name}
                voice={voice}
                onDelete={() => remove(voice.name)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
