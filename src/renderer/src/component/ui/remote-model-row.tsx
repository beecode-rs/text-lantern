import { Download } from 'lucide-react'
import { StarBadge } from '@src/renderer/src/component/ui/star-badge'
import { formatSingleton } from '@src/renderer/src/lib/format'
import { languageCatalogSingleton } from '@src/shared/language/language-catalog'
import type { RemoteVoice } from '@src/shared/types'

export function RemoteModelRow({
  voice,
  isInstalled,
  isDownloading,
  onDownload
}: {
  voice: RemoteVoice
  isInstalled: boolean
  isDownloading: boolean
  onDownload: () => void
}): React.JSX.Element {
  let downloadLabel = 'Download'
  if (isDownloading) {
    downloadLabel = 'Downloading…'
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate selectable">{voice.name}</span>
          {isInstalled && <StarBadge>installed</StarBadge>}
        </div>
        <div className="text-xs text-text/55 mt-0.5">
          {languageCatalogSingleton().getDisplayName({ code: voice.lang })} · {voice.quality} ·{' '}
          {formatSingleton().formatBytes(voice.sizeBytes)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={isInstalled || isDownloading}
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
        >
          <Download size={13} />
          {downloadLabel}
        </button>
      </div>
    </div>
  )
}
