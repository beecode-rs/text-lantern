import type { ReactNode } from 'react'

export function Row({
  title,
  description,
  children,
  isStacked
}: {
  title?: string
  description?: string
  children: ReactNode
  isStacked?: boolean
}): React.JSX.Element {
  if (isStacked) {
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
