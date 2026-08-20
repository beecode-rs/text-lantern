import { AppWindow, DatabaseBackup, Volume2 } from 'lucide-react'
import { useState } from 'react'

import { GeneralTabBackup } from '#src/renderer/src/component/settings/general-tab-backup'
import { GeneralTabSpeech } from '#src/renderer/src/component/settings/general-tab-speech'
import { GeneralTabWindow } from '#src/renderer/src/component/settings/general-tab-window'
import { TabBar, type TabItem } from '#src/renderer/src/component/ui/tab-bar'

type GeneralTab = 'window' | 'speech' | 'backup'

const TABS: TabItem<GeneralTab>[] = [
  { icon: AppWindow, id: 'window', label: 'Window' },
  { icon: Volume2, id: 'speech', label: 'Speech' },
  { icon: DatabaseBackup, id: 'backup', label: 'Backup' },
]

export function GeneralSettings(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<GeneralTab>('window')

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">General</h1>
        <p className="text-sm text-text/55 mt-1">Appearance, window behavior, speech and backups.</p>
      </header>

      <TabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      {getActiveTabPanel({ activeTab })}
    </div>
  )

  function getActiveTabPanel(params: { activeTab: GeneralTab }): React.JSX.Element {
    switch (params.activeTab) {
      case 'window': {
        return <GeneralTabWindow />
      }
      case 'speech': {
        return <GeneralTabSpeech />
      }
      case 'backup': {
        return <GeneralTabBackup />
      }
    }
  }
}
