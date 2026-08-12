import { Trash2, Star } from 'lucide-react'
import { formatService } from '@src/renderer/src/lib/format'
import type { Voice } from '@src/shared/types'

const LANG_BADGE: Record<string, string> = {
  sr: 'Serbian',
  en: 'English',
  other: 'Other'
}

export function ModelCard({
  voice,
  onSetDefaultSr,
  onSetDefaultEn,
  onDelete
}: {
  voice: Voice
  onSetDefaultSr: () => void
  onSetDefaultEn: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate selectable">{voice.name}</span>
          {voice.isDefault && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-logo-primary">
              <Star size={11} fill="currentColor" /> default
            </span>
          )}
        </div>
        <div className="text-xs text-text/55 mt-0.5">
          {LANG_BADGE[voice.lang]} · {formatService.formatBytes(voice.sizeBytes)}
          {!voice.hasJson && <span className="text-red-500"> · missing .json</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onSetDefaultSr}
          title="Set as Serbian voice"
          className="px-2 py-1 text-xs rounded-md bg-mid-gray/10 hover:bg-mid-gray/25 transition-colors"
        >
          sr
        </button>
        <button
          type="button"
          onClick={onSetDefaultEn}
          title="Set as English voice"
          className="px-2 py-1 text-xs rounded-md bg-mid-gray/10 hover:bg-mid-gray/25 transition-colors"
        >
          en
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete voice"
          className="p-1.5 rounded-md text-text/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

export function DownloadRow({
  name,
  progress
}: {
  name: string
  progress: number
}): React.JSX.Element {
  const pct = Math.round(progress * 100)
  return (
    <div className="px-4 py-3 border border-logo-primary/40 rounded-xl bg-logo-primary/5">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate selectable">{name}</span>
        <span className="tabular-nums text-text/60">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-mid-gray/25 overflow-hidden">
        <div
          className="h-full bg-logo-primary transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
