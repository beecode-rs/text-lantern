import { Cpu, Link2, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DownloadTabManual } from '#src/renderer/src/component/settings/download-tab-manual'
import { DownloadTabPredefined } from '#src/renderer/src/component/settings/download-tab-predefined'
import { DownloadTabSearch } from '#src/renderer/src/component/settings/download-tab-search'
import { ModelsTabInstalled } from '#src/renderer/src/component/settings/models-tab-installed'
import { DownloadRow } from '#src/renderer/src/component/ui/download-row'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { TabBar, type TabItem } from '#src/renderer/src/component/ui/tab-bar'
import { useModelsStore } from '#src/renderer/src/store/models'

type ModelsTab = 'models' | 'search' | 'manual' | 'predefined'

const TABS: TabItem<ModelsTab>[] = [
  { icon: Cpu, id: 'models', label: 'Models' },
  { icon: Search, id: 'search', label: 'Search' },
  { icon: Link2, id: 'manual', label: 'Manual download' },
  { icon: Star, id: 'predefined', label: 'App favorite' },
]

export function ModelsSettings(): React.JSX.Element {
  const { voices, downloads, load, download, dismissDownload } = useModelsStore()

  const [activeTab, setActiveTab] = useState<ModelsTab>('models')

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

  const installedNames = useMemo(() => {
    return new Set(
      voices.map((voice) => {
        return voice.name
      }),
    )
  }, [voices])

  const downloadingNames = useMemo(() => {
    return Object.entries(downloads)
      .filter(([, download]) => {
        return download.state === 'downloading'
      })
      .map(([name]) => {
        return name
      })
  }, [downloads])

  const downloadRows = useMemo(() => {
    return Object.entries(downloads).map(([name, download]) => {
      return { download, name }
    })
  }, [downloads])

  const activeTabPanel = getActiveTabPanel({ activeTab, downloadingNames, installedNames })

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-text/55 mt-1">
          Voices are stored in <code className="text-xs">models/</code>. Browse the catalog or add any Piper voice.
        </p>
      </header>

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {downloadRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-text/60 px-1">Downloads</h2>
          {downloadRows.map((d) => {
            return (
              <DownloadRow
                key={d.name}
                name={d.name}
                download={d.download}
                onRetry={() => {
                  void download(d.name)
                }}
                onDismiss={() => {
                  dismissDownload(d.name)
                }}
              />
            )
          })}
        </section>
      )}

      {activeTabPanel}
    </SettingsPage>
  )

  function getActiveTabPanel(params: {
    activeTab: ModelsTab
    downloadingNames: string[]
    installedNames: Set<string>
  }): React.JSX.Element {
    switch (params.activeTab) {
      case 'models': {
        return <ModelsTabInstalled />
      }
      case 'search': {
        return <DownloadTabSearch downloadingNames={params.downloadingNames} installedNames={params.installedNames} />
      }
      case 'manual': {
        return <DownloadTabManual />
      }
      case 'predefined': {
        return (
          <DownloadTabPredefined downloadingNames={params.downloadingNames} installedNames={params.installedNames} />
        )
      }
    }
  }
}
