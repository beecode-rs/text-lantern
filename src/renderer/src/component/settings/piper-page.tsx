import { AlertTriangle, Download, Link2, RefreshCw, Search, Star } from 'lucide-react'
import { useState } from 'react'

import { DownloadTabManual } from '#src/renderer/src/component/settings/download-tab-manual'
import { DownloadTabPredefined } from '#src/renderer/src/component/settings/download-tab-predefined'
import { DownloadTabSearch } from '#src/renderer/src/component/settings/download-tab-search'
import { type ProviderPageProps } from '#src/renderer/src/component/settings/provider-page-registry'
import { TabBar, type TabItem } from '#src/renderer/src/component/ui/tab-bar'
import { useModelsStore } from '#src/renderer/src/store/models'
import { ModelsTab, usePageTabsStore } from '#src/renderer/src/store/page-tabs'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import { DEFAULT_VOICE_OPTIONS } from '#src/shared/voice/default-voice'

const TABS: TabItem<ModelsTab>[] = [
  { icon: Search, id: ModelsTab.SEARCH, label: 'Search' },
  { icon: Link2, id: ModelsTab.MANUAL, label: 'Manual download' },
  { icon: Star, id: ModelsTab.PREDEFINED, label: 'App favorite' },
]

export function PiperPage({ downloadingIds, installedIds }: ProviderPageProps): React.JSX.Element {
  const { installEngine, isEngineInstalled, isInstalling, logs } = useModelsStore()

  const activeTab = usePageTabsStore((s) => s.modelsTab)
  const setActiveTab = usePageTabsStore((s) => s.setModelsTab)
  const [selectedVoiceNames, setSelectedVoiceNames] = useState<string[]>(() => {
    return DEFAULT_VOICE_OPTIONS.map((option) => {
      return option.voiceName
    })
  })

  const installButtonIcon = getInstallButtonIcon({ isInstalling })
  const installButtonLabel = getInstallButtonLabel({ isInstalling })

  return (
    <div className="flex flex-col gap-3">
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

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {getActivePanel({ activeTab, downloadingIds, installedIds })}
    </div>
  )

  function getActivePanel(params: {
    activeTab: ModelsTab
    downloadingIds: string[]
    installedIds: Set<string>
  }): React.JSX.Element {
    switch (params.activeTab) {
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
}
