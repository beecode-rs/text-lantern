import { Trash2 } from 'lucide-react'

import { StarBadge } from '#src/renderer/src/component/ui/star-badge'
import { formatSingleton } from '#src/renderer/src/lib/format'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { Voice } from '#src/shared/types'
import { voiceLabelUtil } from '#src/shared/voice/voice-label'

export function ModelCard({ voice, onDelete }: { voice: Voice; onDelete: () => void }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate selectable">{voice.name}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text/45">
            {voiceLabelUtil.providerLabel({ provider: voice.provider })}
          </span>
          {voice.isInUse && <StarBadge>in use</StarBadge>}
        </div>
        <div className="text-xs text-text/55 mt-0.5">
          {languageCatalogSingleton().getDisplayName({ code: voice.lang })} ·{' '}
          {formatSingleton().formatBytes(voice.sizeBytes)}
          {!voice.hasJson && <span className="text-red-500"> · missing .json</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onDelete}
          title="Delete voice"
          className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
