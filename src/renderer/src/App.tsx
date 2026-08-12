import { useEffect, useState } from 'react'
import { Sidebar, type Section } from './components/Sidebar'
import { NowPlaying } from './components/NowPlaying'
import { GeneralSettings } from './components/settings/General'
import { ModelsSettings } from './components/settings/Models'
import { ShortcutsSettings } from './components/settings/Shortcuts'
import { AboutSettings } from './components/settings/About'
import { useSettingsStore } from './store/settings'
import { useModelsStore } from './store/models'
import { api } from './api'

function Section({ active }: { active: Section }): React.JSX.Element {
  switch (active) {
    case 'general':
      return <GeneralSettings />
    case 'models':
      return <ModelsSettings />
    case 'shortcuts':
      return <ShortcutsSettings />
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
