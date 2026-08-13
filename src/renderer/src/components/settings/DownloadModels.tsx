import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Search, Loader2 } from 'lucide-react'
import { useModelsStore } from '@src/renderer/src/store/models'
import { DownloadRow } from '@src/renderer/src/components/ui/ModelCard'
import { RemoteModelRow } from '@src/renderer/src/components/ui/RemoteModelRow'

export function DownloadModels({
  onBack
}: {
  onBack: () => void
}): React.JSX.Element {
  const { voices, remote, searching, searchError, progress, search, download } = useModelsStore()

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [addName, setAddName] = useState('')

  const installedNames = useMemo(() => {
    return new Set(voices.map((voice) => {
      return voice.name
    }))
  }, [voices])

  const downloadingNames = Object.keys(progress)
  const downloadingRows = useMemo(() => {
    return downloadingNames.map((name) => {
      return { name, progress: progress[name] }
    })
  }, [downloadingNames, progress])

  const runSearch = (): void => {
    const q = query.trim()
    if (!q) {
      return
    }
    setSubmittedQuery(q)
    void search(q)
  }

  const hasSearched = submittedQuery.length > 0
  const showEmpty = !searching && !searchError && hasSearched && remote.length === 0

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 -ml-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg text-text/70 hover:bg-mid-gray/20"
        >
          <ArrowLeft size={15} /> Models
        </button>
      </div>

      <header>
        <h1 className="text-xl font-semibold">Download voices</h1>
        <p className="text-sm text-text/55 mt-1">
          Search the Piper voice catalog by language code (e.g. <code className="text-xs">en</code>,{' '}
          <code className="text-xs">de</code>) or name (e.g. <span className="selectable">english</span>).
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  runSearch()
                }
              }}
              placeholder="Language, e.g. en or english"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
            />
          </div>
          <button
            type="button"
            disabled={!query.trim() || searching}
            onClick={runSearch}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
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
        {searching && <p className="text-sm text-text/50 px-1 py-6 text-center">Searching…</p>}

        {!searching && searchError && (
          <p className="text-sm text-red-500 px-1 py-6 text-center">{searchError}</p>
        )}

        {showEmpty && (
          <p className="text-sm text-text/50 px-1 py-6 text-center">
            No voices found for <span className="selectable">{submittedQuery}</span>.
          </p>
        )}

        {!searching && remote.length > 0 && (
          <div className="flex flex-col gap-2">
            {remote.map((voice) => (
              <RemoteModelRow
                key={voice.name}
                voice={voice}
                installed={installedNames.has(voice.name)}
                downloading={downloadingNames.includes(voice.name)}
                onDownload={() => {
                  void download(voice.name)
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 pt-2 border-t border-mid-gray/20">
        <h2 className="text-sm font-medium text-text/60 px-1 mt-2">Add by exact name</h2>
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
            placeholder="e.g. sr_Marko_medium"
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
          For voices outside the catalog, e.g. the custom Serbian{' '}
          <span className="selectable">sr_Marko_medium</span>.
        </p>
      </section>
    </div>
  )
}
