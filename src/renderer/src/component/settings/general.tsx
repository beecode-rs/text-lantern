import { AppWindow, DatabaseBackup, Volume2 } from 'lucide-react'

import { GeneralTabBackup } from '#src/renderer/src/component/settings/general-tab-backup'
import { GeneralTabSpeech } from '#src/renderer/src/component/settings/general-tab-speech'
import { GeneralTabWindow } from '#src/renderer/src/component/settings/general-tab-window'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { TabBar, type TabItem } from '#src/renderer/src/component/ui/tab-bar'
import { GeneralTab, usePageTabsStore } from '#src/renderer/src/store/page-tabs'

const TABS: TabItem<GeneralTab>[] = [
  { icon: AppWindow, id: GeneralTab.WINDOW, label: 'Window' },
  { icon: Volume2, id: GeneralTab.SPEECH, label: 'Speech' },
  { icon: DatabaseBackup, id: GeneralTab.BACKUP, label: 'Backup' },
]

export function GeneralSettings(): React.JSX.Element {
  const activeTab = usePageTabsStore((s) => s.generalTab)
  const setActiveTab = usePageTabsStore((s) => s.setGeneralTab)

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-text/55 mt-1">Appearance, window behavior, speech and backups.</p>
      </header>

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {getActiveTabPanel({ activeTab })}
    </SettingsPage>
  )

  function getActiveTabPanel(params: { activeTab: GeneralTab }): React.JSX.Element {
    switch (params.activeTab) {
      case GeneralTab.WINDOW: {
        return <GeneralTabWindow />
      }
      case GeneralTab.SPEECH: {
        return <GeneralTabSpeech />
      }
      case GeneralTab.BACKUP: {
        return <GeneralTabBackup />
      }
    }
  }
}
