import { Check, RefreshCw, X } from 'lucide-react'
import type { VoiceDownload, VoiceDownloadState } from '@src/shared/types'

export function DownloadRow({
  name,
  download,
  onRetry,
  onDismiss
}: {
  name: string
  download: VoiceDownload
  onRetry?: () => void
  onDismiss?: () => void
}): React.JSX.Element {
  const pct = Math.round(download.progress * 100)
  return (
    <div className={getCardClassName({ state: download.state })}>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate selectable">{name}</span>
        <div className="flex items-center gap-1">
          {getStatusBadge({ state: download.state, pct })}
          {download.state === 'error' && onRetry !== undefined && (
            <button
              type="button"
              onClick={onRetry}
              aria-label={`Retry download of ${name}`}
              className="rounded p-0.5 text-text/50 hover:text-text"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {download.state === 'error' && onDismiss !== undefined && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={`Dismiss failed download of ${name}`}
              className="rounded p-0.5 text-text/50 hover:text-text"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-mid-gray/25 overflow-hidden">
        <div
          className={getBarClassName({ state: download.state })}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )

  function getCardClassName(params: { state: VoiceDownloadState }): string {
    switch (params.state) {
      case 'downloading': {
        return 'px-4 py-3 border border-logo-primary/40 rounded-xl bg-logo-primary/5'
      }
      case 'done': {
        return 'px-4 py-3 border border-green-500/40 rounded-xl bg-green-500/5'
      }
      case 'error': {
        return 'px-4 py-3 border border-red-500/40 rounded-xl bg-red-500/5'
      }
    }
  }

  function getBarClassName(params: { state: VoiceDownloadState }): string {
    switch (params.state) {
      case 'downloading': {
        return 'h-full bg-gradient-to-r from-logo-primary to-accent transition-[width] duration-150'
      }
      case 'done': {
        return 'h-full bg-green-500 transition-[width] duration-150'
      }
      case 'error': {
        return 'h-full bg-red-500 transition-[width] duration-150'
      }
    }
  }

  function getStatusBadge(params: { state: VoiceDownloadState; pct: number }): React.JSX.Element {
    switch (params.state) {
      case 'downloading': {
        return <span className="tabular-nums text-text/60">{params.pct}%</span>
      }
      case 'done': {
        return (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <Check size={13} /> Done
          </span>
        )
      }
      case 'error': {
        return <span className="text-red-500">Failed</span>
      }
    }
  }
}
