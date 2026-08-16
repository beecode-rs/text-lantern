import type { Section } from '@src/renderer/src/component/sidebar'
import { GeneralSettings } from '@src/renderer/src/component/settings/general'
import { ModelsSettings } from '@src/renderer/src/component/settings/models'
import { LanguagesSettings } from '@src/renderer/src/component/settings/languages'
import { TestSettings } from '@src/renderer/src/component/settings/test'
import { HistorySettings } from '@src/renderer/src/component/settings/history'
import { AboutSettings } from '@src/renderer/src/component/settings/about'

export function SettingsSection({ active }: { active: Section }): React.JSX.Element {
  switch (active) {
    case 'general':
      return <GeneralSettings />
    case 'models':
      return <ModelsSettings />
    case 'languages':
      return <LanguagesSettings />
    case 'test':
      return <TestSettings />
    case 'history':
      return <HistorySettings />
    case 'about':
      return <AboutSettings />
    default: {
      const exhaustive: never = active
      throw new Error(`Unknown settings section: ${String(exhaustive)}`)
    }
  }
}
