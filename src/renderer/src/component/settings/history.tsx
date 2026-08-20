import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { api } from '#src/renderer/src/api'
import { HistoryItem } from '#src/renderer/src/component/settings/history-item'
import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { useHistoryStore } from '#src/renderer/src/store/history'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import type { HistoryEntry } from '#src/shared/types'

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
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)

  if (!settings) {
    return <></>
  }

  const onReplay = (entry: HistoryEntry): void => {
    const lang = entry.voice.split('_')[0]
    void api.speak(lang, entry.text, { shouldSkipHistory: true })
  }

  const limitLabel = getLimitLabel({ historyLimit: settings.historyLimit })
  const entryList = getEntryList({
    entries,
    onReplay,
    onRequestClear: () => {
      setIsClearConfirmOpen(true)
    },
  })

  return (
    <SettingsPage>
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
              void update({ historyLimit: Math.max(1, Number(e.target.value) || 1) })
            }}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-right"
          />
        </Row>
      </SettingsGroup>

      {entryList}

      {isClearConfirmOpen && (
        <ConfirmDialog
          title="Clear history"
          message={`Clear all ${String(entries.length)} entries from history? This cannot be undone.`}
          confirmLabel="Clear"
          onConfirm={() => {
            void clear()
            setIsClearConfirmOpen(false)
          }}
          onCancel={() => {
            setIsClearConfirmOpen(false)
          }}
        />
      )}
    </SettingsPage>
  )

  function getLimitLabel(params: { historyLimit: number }): string {
    if (params.historyLimit === 1) {
      return '1 entry'
    }

    return `${String(params.historyLimit)} entries`
  }

  function getEntryList(params: {
    entries: HistoryEntry[]
    onReplay: (entry: HistoryEntry) => void
    onRequestClear: () => void
  }): React.JSX.Element {
    if (params.entries.length === 0) {
      return (
        <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-6 text-center text-sm text-text/55">
          Nothing here yet. Read some text and it will show up.
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              params.onRequestClear()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 text-text/80 hover:bg-mid-gray/15 transition-colors"
          >
            <Trash2 size={13} className="text-red-500" /> Clear
          </button>
        </div>
        {params.entries.map((entry) => {
          return <HistoryItem key={entry.id} entry={entry} onReplay={params.onReplay} />
        })}
      </div>
    )
  }
}
