import { Clock, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { HistoryEntry } from '#src/shared/types'
import { voiceLabelUtil } from '#src/shared/voice/voice-label'

const PREVIEW_CHARS = 160

export function HistoryItem({
  entry,
  onReplay,
  onRemove,
}: {
  entry: HistoryEntry
  onReplay: (entry: HistoryEntry) => void
  onRemove: (entry: HistoryEntry) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const langCode = voiceLabelUtil.langCode({ id: entry.voice })
  const langName = languageCatalogSingleton().getDisplayName({ code: langCode })
  const time = new Date(entry.createdAt)
  const isLong = entry.text.length > PREVIEW_CHARS
  const display = getDisplayText({ expanded, isLong, text: entry.text })
  const toggleLabel = getToggleLabel({ expanded })

  return (
    <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text/55 min-w-0">
          <Clock size={12} className="shrink-0" />
          <span className="whitespace-nowrap">{time.toLocaleString()}</span>
          <span className="shrink-0">·</span>
          <span className="selectable truncate">
            {langName} · {voiceLabelUtil.displayName({ id: entry.voice })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsRemoveConfirmOpen(true)
            }}
            title="Remove entry"
            className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              onReplay(entry)
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-logo-primary text-logo-stroke hover:opacity-90 transition-opacity shrink-0"
          >
            <RotateCcw size={11} /> Replay
          </button>
        </div>
      </div>
      <p className="text-sm text-text/85 whitespace-pre-wrap break-words selectable">{display}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => {
              return !v
            })
          }}
          className="self-start text-xs text-logo-primary hover:underline"
        >
          {toggleLabel}
        </button>
      )}
      {isRemoveConfirmOpen && (
        <ConfirmDialog
          title="Remove entry"
          message="Remove this reading from history? This cannot be undone."
          confirmLabel="Remove"
          onConfirm={() => {
            setIsRemoveConfirmOpen(false)
            onRemove(entry)
          }}
          onCancel={() => {
            setIsRemoveConfirmOpen(false)
          }}
        />
      )}
    </div>
  )

  function getDisplayText(params: { text: string; expanded: boolean; isLong: boolean }): string {
    if (params.isLong && !params.expanded) {
      return `${params.text.slice(0, PREVIEW_CHARS)}…`
    }

    return params.text
  }

  function getToggleLabel(params: { expanded: boolean }): string {
    if (params.expanded) {
      return 'Show less'
    }

    return 'Show more'
  }
}
