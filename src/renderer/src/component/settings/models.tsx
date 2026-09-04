import { useEffect, useMemo } from 'react'

import { ModelsTabInstalled } from '#src/renderer/src/component/settings/models-tab-installed'
import { PROVIDER_PAGES, type ProviderPageProps } from '#src/renderer/src/component/settings/provider-page-registry'
import { DownloadRow } from '#src/renderer/src/component/ui/download-row'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { useModelsStore } from '#src/renderer/src/store/models'
import { ModelsProvider, usePageTabsStore } from '#src/renderer/src/store/page-tabs'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import { experimentalUtil } from '#src/shared/experimental/experimental-util'
import { TtsProvider } from '#src/shared/types'
import { TTS_PROVIDER_LABEL } from '#src/shared/voice/tts-provider-label'
import { voiceIdParser } from '#src/shared/voice/voice-id'

interface RailItem {
  id: ModelsProvider | TtsProvider
  label: string
}

export function ModelsSettings(): React.JSX.Element {
  const { voices, downloads, load, download, dismissDownload } = useModelsStore()

  const settings = useSettingsStore((s) => s.settings)

  const modelsProvider = usePageTabsStore((s) => s.modelsProvider)
  const setModelsProvider = usePageTabsStore((s) => s.setModelsProvider)

  const isCosyvoiceActive = experimentalUtil.isCosyvoiceActive({ settings })

  useEffect(() => {
    void load()
  }, [load, isCosyvoiceActive])

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

  const activePanel = getActivePanel({ downloadingIds, installedIds, modelsProvider })

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-text/55 mt-1">
          Voices are stored in <code className="text-xs">models/</code> and run fully on-device.
        </p>
      </header>

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

      <div className="flex items-start gap-4">
        <nav className="flex flex-col gap-1 w-36 shrink-0">
          {getRailItems({ isCosyvoiceActive }).map((item) => {
            const isActive = modelsProvider === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setModelsProvider(item.id)
                }}
                className={getRailButtonClassName({ isActive })}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col gap-3">{activePanel}</div>
      </div>
    </SettingsPage>
  )

  function getActivePanel(
    params: ProviderPageProps & { modelsProvider: TtsProvider | ModelsProvider },
  ): React.JSX.Element {
    if (params.modelsProvider === ModelsProvider.ALL) {
      return <ModelsTabInstalled />
    }
    if (params.modelsProvider === TtsProvider.COSYVOICE && !isCosyvoiceActive) {
      return <ModelsTabInstalled />
    }

    const Page = PROVIDER_PAGES[params.modelsProvider].component

    return <Page downloadingIds={params.downloadingIds} installedIds={params.installedIds} />
  }

  function getRailItems(params: { isCosyvoiceActive: boolean }): RailItem[] {
    const providerIds = (Object.keys(PROVIDER_PAGES) as TtsProvider[]).filter((provider) => {
      if (provider === TtsProvider.COSYVOICE && !params.isCosyvoiceActive) {
        return false
      }

      return true
    })

    return [
      { id: ModelsProvider.ALL, label: 'All voices' },
      ...providerIds.map((provider) => {
        return { id: provider, label: TTS_PROVIDER_LABEL[provider] }
      }),
    ]
  }

  function getRailButtonClassName(params: { isActive: boolean }): string {
    const base =
      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors text-left'
    if (params.isActive) {
      return `${base} bg-logo-primary text-logo-stroke`
    }

    return `${base} text-text/85 hover:bg-mid-gray/20`
  }
}
