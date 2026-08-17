import type { ReactNode } from 'react'

export function SettingsGroup({
  title,
  description,
  children,
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
