import { Download } from 'lucide-react'

import { StarBadge } from '#src/renderer/src/component/ui/star-badge'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { DefaultVoiceOption } from '#src/shared/voice/default-voice'

export function DefaultVoiceRow({
  option,
  isInstalled,
  isDownloading,
  onDownload,
}: {
  option: DefaultVoiceOption
  isInstalled: boolean
  isDownloading: boolean
  onDownload: () => void
}): React.JSX.Element {
  const downloadLabel = getDownloadLabel({ isDownloading })

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate selectable">
            {languageCatalogSingleton().getDisplayName({ code: option.langCode })}
          </span>
          {isInstalled && <StarBadge>installed</StarBadge>}
        </div>
        <div className="text-xs text-text/55 mt-0.5">
          <code className="selectable">{option.voiceName}</code>
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

  function getDownloadLabel(params: { isDownloading: boolean }): string {
    if (params.isDownloading) {
      return 'Downloading…'
    }

    return 'Download'
  }
}
