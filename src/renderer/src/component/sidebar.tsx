import { Cpu, FlaskConical, History, Info, Languages, Settings, Volume2 } from 'lucide-react'
import type { ComponentType } from 'react'

import iconUrl from '#src/renderer/src/asset/icon.png'
import { useSettingsStore } from '#src/renderer/src/store/settings'

export type Section = 'general' | 'models' | 'languages' | 'test' | 'history' | 'experimental' | 'about'

const ITEMS: { id: Section; label: string; icon: ComponentType<{ size?: number | string }> }[] = [
  { icon: Settings, id: 'general', label: 'Settings' },
  { icon: Cpu, id: 'models', label: 'Models' },
  { icon: Languages, id: 'languages', label: 'Languages' },
  { icon: Volume2, id: 'test', label: 'Test' },
  { icon: History, id: 'history', label: 'History' },
  { icon: FlaskConical, id: 'experimental', label: 'Experimental' },
  { icon: Info, id: 'about', label: 'About' },
]

export function Sidebar({ active, onChange }: { active: Section; onChange: (s: Section) => void }): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)

  const getItemClassName = (params: { isActive: boolean }): string => {
    const base = 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors'
    if (params.isActive) {
      return `${base} bg-logo-primary text-logo-stroke`
    }

    return `${base} text-text/85 hover:bg-mid-gray/20`
  }

  return (
    <nav className="flex flex-col w-44 h-full border-r border-mid-gray/20 items-stretch px-2 pt-4 pb-2 select-none">
      <div className="flex items-center gap-2 px-2 mb-5">
        <img src={iconUrl} alt="" className="h-7 w-7 rounded-lg" draggable={false} />
        <span className="text-sm font-semibold tracking-tight">Text Lantern</span>
      </div>

      <div className="flex flex-col gap-1">
        {getItems({ isExperimentalFeaturesEnabled: settings?.isExperimentalFeaturesEnabled ?? false }).map(
          ({ id, label, icon: Icon }) => {
            const isActive = active === id
            const itemClassName = getItemClassName({ isActive })

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id)
                }}
                className={itemClassName}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          },
        )}
      </div>

      <div className="mt-auto px-2 text-[11px] text-text/40">On-device TTS</div>
    </nav>
  )

  function getItems(params: { isExperimentalFeaturesEnabled: boolean }): typeof ITEMS {
    return ITEMS.filter((item) => {
      if (item.id === 'experimental' && !params.isExperimentalFeaturesEnabled) {
        return false
      }

      return true
    })
  }
}
