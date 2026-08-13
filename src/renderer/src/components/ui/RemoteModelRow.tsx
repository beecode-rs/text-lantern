import { Download } from 'lucide-react'
import { StarBadge } from '@src/renderer/src/components/ui/StarBadge'
import { formatService } from '@src/renderer/src/lib/format'
import { ttsLanguageName } from '@src/shared/languages'
import type { RemoteVoice } from '@src/shared/types'

export function RemoteModelRow({
  voice,
  installed,
  downloading,
  onDownload
}: {
  voice: RemoteVoice
  installed: boolean
  downloading: boolean
  onDownload: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate selectable">{voice.name}</span>
          {installed && <StarBadge>installed</StarBadge>}
        </div>
        <div className="text-xs text-text/55 mt-0.5">
          {ttsLanguageName({ code: voice.lang })} · {voice.quality} ·{' '}
          {formatService.formatBytes(voice.sizeBytes)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={installed || downloading}
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
        >
          <Download size={13} />
          {downloading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </div>
  )
}
