import { useState } from 'react'
import { Clock, RotateCcw, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@src/renderer/src/store/settings'
import { useHistoryStore } from '@src/renderer/src/store/history'
import { SettingsGroup, Row } from '@src/renderer/src/components/ui/SettingsGroup'
import { ttsLanguageName } from '@src/shared/languages'
import { api } from '@src/renderer/src/api'
import type { HistoryEntry } from '@src/shared/types'

const PREVIEW_CHARS = 160

function HistoryItem({
  entry,
  onReplay
}: {
  entry: HistoryEntry
  onReplay: (entry: HistoryEntry) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const langCode = entry.voice.split('_')[0]
  const langName = ttsLanguageName({ code: langCode })
  const time = new Date(entry.createdAt)
  const isLong = entry.text.length > PREVIEW_CHARS
  const truncated = !expanded && isLong
  const display = truncated ? `${entry.text.slice(0, PREVIEW_CHARS)}…` : entry.text

  return (
    <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text/55 min-w-0">
          <Clock size={12} className="shrink-0" />
          <span className="whitespace-nowrap">{time.toLocaleString()}</span>
          <span className="shrink-0">·</span>
          <span className="selectable truncate">{langName} · {entry.voice}</span>
        </div>
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
      <p className="text-sm text-text/85 whitespace-pre-wrap break-words selectable">{display}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => {
            setExpanded((v) => {
              return !v
            })
          }}
          className="self-start text-xs text-logo-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

export function HistorySettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => {
    return s.settings
  })
  const update = useSettingsStore((s) => {
    return s.update
  })
  const entries = useHistoryStore((s) => {
    return s.entries
  })
  const clear = useHistoryStore((s) => {
    return s.clear
  })

  if (!settings) {
    return <></>
  }

  const onReplay = (entry: HistoryEntry): void => {
    const lang = entry.voice.split('_')[0]
    void api.speak(lang, entry.text)
  }

  const limitLabel = settings.historyLimit === 1 ? '1 entry' : `${settings.historyLimit} entries`

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">History</h1>
        <p className="text-sm text-text/55 mt-1">
          Recent readings, kept on this device. Replay any item if something went wrong.
        </p>
      </header>

      <SettingsGroup title="Retention" description="Number of readings kept, most recent first.">
        <Row title="Keep last" description={limitLabel}>
          <input
            type="number"
            min={1}
            value={settings.historyLimit}
            onChange={(e) => {
              update({ historyLimit: Math.max(1, Number(e.target.value) || 1) })
            }}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-right"
          />
        </Row>
      </SettingsGroup>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-6 text-center text-sm text-text/55">
          Nothing here yet. Read some text and it will show up.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void clear()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 text-text/80 hover:bg-mid-gray/15 transition-colors"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
          {entries.map((entry) => {
            return <HistoryItem key={entry.id} entry={entry} onReplay={onReplay} />
          })}
        </div>
      )}
    </div>
  )
}
