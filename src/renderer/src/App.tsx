import { useEffect, useState } from 'react'
import { Sidebar, type Section } from '@src/renderer/src/components/Sidebar'
import { NowPlaying } from '@src/renderer/src/components/NowPlaying'
import { GeneralSettings } from '@src/renderer/src/components/settings/General'
import { ModelsSettings } from '@src/renderer/src/components/settings/Models'
import { LanguagesSettings } from '@src/renderer/src/components/settings/Languages'
import { TestSettings } from '@src/renderer/src/components/settings/Test'
import { AboutSettings } from '@src/renderer/src/components/settings/About'
import { useSettingsStore } from '@src/renderer/src/store/settings'
import { useModelsStore } from '@src/renderer/src/store/models'
import { api } from '@src/renderer/src/api'

function Section({ active }: { active: Section }): React.JSX.Element {
  switch (active) {
    case 'general':
      return <GeneralSettings />
    case 'models':
      return <ModelsSettings />
    case 'languages':
      return <LanguagesSettings />
    case 'test':
      return <TestSettings />
    case 'about':
      return <AboutSettings />
  }
}

export default function App(): React.JSX.Element {
  const [section, setSection] = useState<Section>('general')
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.load)
  const replaceSettings = useSettingsStore((s) => s.replace)
  const appendLog = useModelsStore((s) => s.appendLog)
  const setProgress = useModelsStore((s) => s.setProgress)

  useEffect(() => {
    void loadSettings()

    const offSettings = api.onSettingsChanged(replaceSettings)
    const offLog = api.onModelsLog((line) => appendLog(line))
    const offProgress = api.onModelsProgress(({ name, progress }) =>
      setProgress(name, progress)
    )

    return () => {
      offSettings()
      offLog()
      offProgress()
    }
  }, [loadSettings, replaceSettings, appendLog, setProgress])

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center text-text/50 text-sm">Loading…</div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-text">
      <div className="h-7 shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onChange={setSection} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Section active={section} />
          </div>
        </main>
      </div>

      <NowPlaying />
    </div>
  )
}
