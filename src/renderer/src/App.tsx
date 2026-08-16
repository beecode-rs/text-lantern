import { useEffect, useState } from 'react'
import { Sidebar, type Section } from '@src/renderer/src/component/sidebar'
import { NowPlaying } from '@src/renderer/src/component/now-playing'
import { SettingsSection } from '@src/renderer/src/component/settings-section'
import { useSettingsStore } from '@src/renderer/src/store/settings'
import { useHistoryStore } from '@src/renderer/src/store/history'
import { useModelsStore } from '@src/renderer/src/store/models'
import { api } from '@src/renderer/src/api'
import { useTheme } from '@src/renderer/src/lib/use-theme'

export default function App(): React.JSX.Element {
  const [section, setSection] = useState<Section>('general')
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.load)
  const replaceSettings = useSettingsStore((s) => s.replace)
  const loadHistory = useHistoryStore((s) => s.load)
  const replaceHistory = useHistoryStore((s) => s.replace)
  const appendLog = useModelsStore((s) => s.appendLog)
  const setProgress = useModelsStore((s) => s.setProgress)

  useEffect(() => {
    void loadSettings()
    void loadHistory()

    const offSettings = api.onSettingsChanged(replaceSettings)
    const offHistory = api.onHistoryChanged(replaceHistory)
    const offLog = api.onModelsLog((line) => {
      appendLog(line)
    })
    const offProgress = api.onModelsProgress(({ name, progress }) => {
      setProgress(name, progress)
    })

    return () => {
      offSettings()
      offHistory()
      offLog()
      offProgress()
    }
  }, [loadSettings, replaceSettings, loadHistory, replaceHistory, appendLog, setProgress])

  useTheme(settings?.theme)

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
            <SettingsSection active={section} />
          </div>
        </main>
      </div>

      <NowPlaying />
    </div>
  )
}
