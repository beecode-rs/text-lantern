import { AboutSettings } from '#src/renderer/src/component/settings/about'
import { ExperimentalSettings } from '#src/renderer/src/component/settings/experimental'
import { GeneralSettings } from '#src/renderer/src/component/settings/general'
import { HistorySettings } from '#src/renderer/src/component/settings/history'
import { LanguagesSettings } from '#src/renderer/src/component/settings/languages'
import { ModelsSettings } from '#src/renderer/src/component/settings/models'
import { TestSettings } from '#src/renderer/src/component/settings/test'
import type { Section } from '#src/renderer/src/component/sidebar'

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
    case 'experimental':
      return <ExperimentalSettings />
    case 'about':
      return <AboutSettings />
    default: {
      const exhaustive: never = active
      throw new Error(`Unknown settings section: ${String(exhaustive)}`)
    }
  }
}
