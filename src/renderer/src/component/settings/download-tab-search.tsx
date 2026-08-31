import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'

import { InfoTooltip } from '#src/renderer/src/component/ui/info-tooltip'
import { RemoteModelRow } from '#src/renderer/src/component/ui/remote-model-row'
import { useModelsStore } from '#src/renderer/src/store/models'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export function DownloadTabSearch({
  installedIds,
  downloadingIds,
}: {
  installedIds: Set<string>
  downloadingIds: string[]
}): React.JSX.Element {
  const { remote, isSearching, searchError, search, download } = useModelsStore()

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const runSearch = (): void => {
    const q = query.trim()
    if (!q) {
      return
    }
    setSubmittedQuery(q)
    void search(q)
  }

  const hasSearched = submittedQuery.length > 0
  const showEmpty = !isSearching && !searchError && hasSearched && remote.length === 0
  const searchButtonIcon = getSearchButtonIcon({ isSearching })

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-text/55">
        Fuzzy-search the Piper voice catalog by language code or name — partial and misspelled queries work (e.g.{' '}
        <code className="text-xs">en</code>, <span className="selectable">germ</span>,{' '}
        <span className="selectable">spanich</span>).{' '}
        <InfoTooltip>
          Search lists voices from the official Piper voices repository on Hugging Face:
          <span className="mt-1 block text-text/95 break-all selectable">
            https://huggingface.co/rhasspy/piper-voices
          </span>
        </InfoTooltip>
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
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
          disabled={!query.trim() || isSearching}
          onClick={runSearch}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
        >
          {searchButtonIcon}
          Search
        </button>
      </div>

      {isSearching && <p className="text-sm text-text/50 px-1 py-6 text-center">Searching…</p>}

      {!isSearching && searchError && <p className="text-sm text-red-500 px-1 py-6 text-center">{searchError}</p>}

      {showEmpty && (
        <p className="text-sm text-text/50 px-1 py-6 text-center">
          No voices found for <span className="selectable">{submittedQuery}</span>.
        </p>
      )}

      {!isSearching && remote.length > 0 && (
        <div className="flex flex-col gap-2">
          {remote.map((voice) => {
            const id = voiceIdParser.build({ name: voice.name, provider: voice.provider })

            return (
              <RemoteModelRow
                key={id}
                voice={voice}
                isInstalled={installedIds.has(id)}
                isDownloading={downloadingIds.includes(id)}
                onDownload={() => {
                  void download(id)
                }}
              />
            )
          })}
        </div>
      )}
    </section>
  )

  function getSearchButtonIcon(params: { isSearching: boolean }): React.JSX.Element {
    if (params.isSearching) {
      return <Loader2 size={14} className="animate-spin" />
    }

    return <Search size={14} />
  }
}
