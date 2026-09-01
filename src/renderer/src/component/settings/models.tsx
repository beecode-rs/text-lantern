import { Cpu, Link2, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DownloadTabKokoro } from '#src/renderer/src/component/settings/download-tab-kokoro'
import { DownloadTabManual } from '#src/renderer/src/component/settings/download-tab-manual'
import { DownloadTabPredefined } from '#src/renderer/src/component/settings/download-tab-predefined'
import { DownloadTabSearch } from '#src/renderer/src/component/settings/download-tab-search'
import { ModelsTabInstalled } from '#src/renderer/src/component/settings/models-tab-installed'
import { DownloadRow } from '#src/renderer/src/component/ui/download-row'
import { Select, type SelectOption } from '#src/renderer/src/component/ui/select'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { TabBar, type TabItem } from '#src/renderer/src/component/ui/tab-bar'
import { useModelsStore } from '#src/renderer/src/store/models'
import { ModelsTab, usePageTabsStore } from '#src/renderer/src/store/page-tabs'
import { TtsProvider } from '#src/shared/types'
import { voiceIdParser } from '#src/shared/voice/voice-id'

const TABS: TabItem<ModelsTab>[] = [
  { icon: Cpu, id: ModelsTab.MODELS, label: 'Models' },
  { icon: Search, id: ModelsTab.SEARCH, label: 'Search' },
  { icon: Link2, id: ModelsTab.MANUAL, label: 'Manual download' },
  { icon: Star, id: ModelsTab.PREDEFINED, label: 'App favorite' },
]

const PROVIDER_OPTIONS: SelectOption<TtsProvider>[] = [
  { label: 'Piper', value: TtsProvider.PIPER },
  { label: 'Kokoro', value: TtsProvider.KOKORO },
]

export function ModelsSettings(): React.JSX.Element {
  const { voices, downloads, load, download, dismissDownload } = useModelsStore()

  const activeTab = usePageTabsStore((s) => s.modelsTab)
  const setActiveTab = usePageTabsStore((s) => s.setModelsTab)
  const [provider, setProvider] = useState<TtsProvider>(TtsProvider.PIPER)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refreshOnFocus = (): void => {
      void load()
    }
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [load])

  const installedIds = useMemo(() => {
    return new Set(
      voices.map((voice) => {
        return voiceIdParser.build({ name: voice.name, provider: voice.provider })
      }),
    )
  }, [voices])

  const downloadingIds = useMemo(() => {
    return Object.entries(downloads)
      .filter(([, download]) => {
        return download.state === 'downloading'
      })
      .map(([id]) => {
        return id
      })
  }, [downloads])

  const downloadRows = useMemo(() => {
    return Object.entries(downloads).map(([id, download]) => {
      return { download, id, name: voiceIdParser.parse({ id }).name }
    })
  }, [downloads])

  const activePanel = getActivePanel({ activeTab, downloadingIds, installedIds, provider })

  return (
    <SettingsPage>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Models</h1>
          {getHeaderSubtitle({ provider })}
        </div>
        <Select value={provider} options={PROVIDER_OPTIONS} onChange={setProvider} ariaLabel="Voice provider" />
      </header>

      {provider === TtsProvider.PIPER && <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />}

      {downloadRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text/60 px-1">Downloads</h2>
          {downloadRows.map((d) => {
            return (
              <DownloadRow
                key={d.id}
                name={d.name}
                download={d.download}
                onRetry={() => {
                  void download(d.id)
                }}
                onDismiss={() => {
                  dismissDownload(d.id)
                }}
              />
            )
          })}
        </section>
      )}

      {activePanel}
    </SettingsPage>
  )

  function getActivePanel(params: {
    activeTab: ModelsTab
    downloadingIds: string[]
    installedIds: Set<string>
    provider: TtsProvider
  }): React.JSX.Element {
    if (params.provider === TtsProvider.KOKORO) {
      return <DownloadTabKokoro downloadingIds={params.downloadingIds} installedIds={params.installedIds} />
    }

    switch (params.activeTab) {
      case ModelsTab.MODELS: {
        return <ModelsTabInstalled />
      }
      case ModelsTab.SEARCH: {
        return <DownloadTabSearch downloadingIds={params.downloadingIds} installedIds={params.installedIds} />
      }
      case ModelsTab.MANUAL: {
        return <DownloadTabManual />
      }
      case ModelsTab.PREDEFINED: {
        return <DownloadTabPredefined downloadingIds={params.downloadingIds} installedIds={params.installedIds} />
      }
    }
  }

  function getHeaderSubtitle(params: { provider: TtsProvider }): React.JSX.Element {
    if (params.provider === TtsProvider.KOKORO) {
      return (
        <p className="text-sm text-text/55 mt-1">
          Kokoro voices are stored in <code className="text-xs">models/kokoro/</code> and run in-app — no engine install
          needed.
        </p>
      )
    }

    return (
      <p className="text-sm text-text/55 mt-1">
        Voices are stored in <code className="text-xs">models/</code>. Browse the catalog or add any Piper voice.
      </p>
    )
  }
}
