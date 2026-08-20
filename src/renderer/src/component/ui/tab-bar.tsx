import type { ComponentType } from 'react'

export interface TabItem<Id extends string> {
  icon?: ComponentType<{ size?: number | string }>
  id: Id
  label: string
}

export function TabBar<Id extends string>({
  tabs,
  activeId,
  onChange,
}: {
  tabs: TabItem<Id>[]
  activeId: Id
  onChange: (id: Id) => void
}): React.JSX.Element {
  const getButtonClassName = (params: { isActive: boolean }): string => {
    const base =
      'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors'
    if (params.isActive) {
      return `${base} bg-logo-primary text-logo-stroke`
    }

    return `${base} text-text/70 hover:bg-mid-gray/20`
  }

  return (
    <div role="tablist" className="flex gap-1 p-1 rounded-xl border border-mid-gray/25 bg-mid-gray/10">
      {tabs.map((tab) => {
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeId}
            onClick={() => {
              onChange(tab.id)
            }}
            className={getButtonClassName({ isActive: tab.id === activeId })}
          >
            {Icon !== undefined && <Icon size={14} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
