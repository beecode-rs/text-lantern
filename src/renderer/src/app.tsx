import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { NowPlaying } from '#src/renderer/src/component/now-playing'
import { SettingsSection } from '#src/renderer/src/component/settings-section'
import { type Section, Sidebar } from '#src/renderer/src/component/sidebar'
import { ShortcutSetupPrompt } from '#src/renderer/src/component/ui/shortcut-setup-prompt'
import { useTheme } from '#src/renderer/src/lib/use-theme'
import { useConfigBackupStore } from '#src/renderer/src/store/config-backup'
import { useHistoryStore } from '#src/renderer/src/store/history'
import { useModelsStore } from '#src/renderer/src/store/models'
import { useSettingsStore } from '#src/renderer/src/store/settings'

export default function App(): React.JSX.Element {
  const [section, setSection] = useState<Section>('general')
  const [isSetupPromptVisible, setIsSetupPromptVisible] = useState(false)
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.load)
  const replaceSettings = useSettingsStore((s) => s.replace)
  const loadHistory = useHistoryStore((s) => s.load)
  const replaceHistory = useHistoryStore((s) => s.replace)
  const appendLog = useModelsStore((s) => s.appendLog)
  const setProgress = useModelsStore((s) => s.setProgress)
  const hasCompletedDownload = useModelsStore((s) => s.hasCompletedDownload)
  const acknowledgeCompletedDownload = useModelsStore((s) => s.acknowledgeCompletedDownload)
  const appendConfigLog = useConfigBackupStore((s) => s.appendLog)
  const setConfigProgress = useConfigBackupStore((s) => s.setProgress)

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
    const offConfigLog = api.onConfigLog((line) => {
      appendConfigLog(line)
    })
    const offConfigProgress = api.onConfigProgress(({ name, progress }) => {
      setConfigProgress(name, progress)
    })

    return () => {
      offSettings()
      offHistory()
      offLog()
      offProgress()
      offConfigLog()
      offConfigProgress()
    }
  }, [
    loadSettings,
    replaceSettings,
    loadHistory,
    replaceHistory,
    appendLog,
    setProgress,
    appendConfigLog,
    setConfigProgress,
  ])

  useEffect(() => {
    if (!hasCompletedDownload) {
      return
    }
    if (settings === null) {
      return
    }
    if (settings.languageBindings.length > 0) {
      acknowledgeCompletedDownload()

      return
    }
    setIsSetupPromptVisible(true)
  }, [hasCompletedDownload, settings, acknowledgeCompletedDownload])

  const closeSetupPrompt = (): void => {
    setIsSetupPromptVisible(false)
    acknowledgeCompletedDownload()
  }

  useTheme(settings?.theme)

  if (!settings) {
    return <div className="h-screen flex items-center justify-center text-text/50 text-sm">Loading…</div>
  }

  return (
    <div className="h-screen flex flex-col bg-background text-text">
      <div className="app-region-drag h-7 shrink-0" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onChange={setSection} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <SettingsSection active={section} />
          </div>
        </main>
      </div>

      <NowPlaying />

      {isSetupPromptVisible && (
        <ShortcutSetupPrompt
          onSetup={() => {
            closeSetupPrompt()
            setSection('languages')
          }}
          onDismiss={closeSetupPrompt}
        />
      )}
    </div>
  )
}
