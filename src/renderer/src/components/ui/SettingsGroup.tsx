import type { ReactNode } from 'react'

export function SettingsGroup({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="w-full">
      <h2 className="text-sm font-semibold mb-1 px-1">{title}</h2>
      {description && <p className="text-xs text-text/55 mb-2 px-1">{description}</p>}
      <div className="rounded-xl border border-mid-gray/30 bg-mid-gray/5 divide-y divide-mid-gray/15 overflow-hidden">
        {children}
      </div>
    </section>
  )
}

export function Row({
  title,
  description,
  children,
  stacked
}: {
  title?: string
  description?: string
  children: ReactNode
  stacked?: boolean
}): React.JSX.Element {
  if (stacked) {
    return (
      <div className="px-4 py-3">
        {title && <div className="text-sm font-medium mb-2">{title}</div>}
        {description && <div className="text-xs text-text/55 mb-2">{description}</div>}
        {children}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {title && <div className="text-sm font-medium truncate">{title}</div>}
        {description && <div className="text-xs text-text/55 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
