import { DownloadTabKokoro } from '#src/renderer/src/component/settings/download-tab-kokoro'
import { type ProviderPageProps } from '#src/renderer/src/component/settings/provider-page-registry'

export function KokoroPage({ downloadingIds, installedIds }: ProviderPageProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text/55">
        Kokoro voices are stored in <code className="text-xs">models/kokoro/</code> and run in-app — no engine install
        needed. English-only voices on a single shared model — the ~86 MB model downloads once with your first voice,
        every voice after that is instant.
      </p>
      <DownloadTabKokoro downloadingIds={downloadingIds} installedIds={installedIds} />
    </div>
  )
}
