import { Languages } from 'lucide-react'

export function ShortcutSetupPrompt({
  onSetup,
  onDismiss
}: {
  onSetup: () => void
  onDismiss: () => void
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set up shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-mid-gray/25 bg-background p-5 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mid-gray/15">
            <Languages size={16} />
          </span>
          <h2 className="text-base font-semibold">Voice ready — set up a shortcut</h2>
        </div>
        <p className="mt-3 text-sm text-text/70 leading-relaxed">
          Your first voice is downloaded. Connect it to a language and record a global shortcut to
          start reading text aloud.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-text/70 hover:bg-mid-gray/20 transition-colors"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onSetup}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke transition-colors"
          >
            Set up shortcuts
          </button>
        </div>
      </div>
    </div>
  )
}
