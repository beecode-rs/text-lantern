import { AlertTriangle } from 'lucide-react'

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-mid-gray/25 bg-background p-5 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
            <AlertTriangle size={16} className="text-red-500" />
          </span>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="mt-3 text-sm text-text/70 leading-relaxed">{message}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-text/70 hover:bg-mid-gray/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
