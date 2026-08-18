import { Save, Upload } from 'lucide-react'

import { DownloadRow } from '#src/renderer/src/component/ui/download-row'
import { Row } from '#src/renderer/src/component/ui/row'
import { Select, type SelectOption } from '#src/renderer/src/component/ui/select'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { Slider } from '#src/renderer/src/component/ui/slider'
import { Toggle } from '#src/renderer/src/component/ui/toggle'
import { useConfigBackupStore } from '#src/renderer/src/store/config-backup'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import type { ThemePreference, VoiceDownload } from '#src/shared/types'

const THEME_OPTIONS: SelectOption<ThemePreference>[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

export function GeneralSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const isExporting = useConfigBackupStore((s) => s.isExporting)
  const isImporting = useConfigBackupStore((s) => s.isImporting)
  const logs = useConfigBackupStore((s) => s.logs)
  const progress = useConfigBackupStore((s) => s.progress)
  const exportConfig = useConfigBackupStore((s) => s.exportConfig)
  const importConfig = useConfigBackupStore((s) => s.importConfig)

  if (!settings) {
    return <></>
  }

  const downloadingRows: { name: string; download: VoiceDownload }[] = Object.keys(progress).map((name) => {
    return { download: { progress: progress[name], state: 'downloading' }, name }
  })

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">General</h1>
        <p className="text-sm text-text/55 mt-1">Appearance, speech speed, and text cleaning.</p>
      </header>

      <SettingsGroup title="Appearance" description="System follows your macOS appearance.">
        <Row title="Theme" description="Choose how Text Lantern looks.">
          <Select
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(v) => {
              void update({ theme: v })
            }}
            ariaLabel="Theme"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Speech" description="Higher reads faster. 1.0× is normal speed.">
        <Row title="Speed" description={getSpeedDescription({ rate: settings.rate })}>
          <Slider
            value={settings.rate}
            min={0.5}
            max={3}
            step={0.05}
            onChange={(v) => {
              void update({ rate: v })
            }}
            format={(v) => {
              return `${v.toFixed(2)}×`
            }}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Text cleaning" description="Applied before speaking.">
        <Row title="Clean text" description="Strip URLs, markdown, code, citations and brackets.">
          <Toggle
            checked={settings.shouldCleanText}
            onChange={(v) => {
              void update({ shouldCleanText: v })
            }}
            ariaLabel="Clean text"
          />
        </Row>
        <Row title="Strip bracketed content" description="Delete the text inside ( ) [ ] { } entirely.">
          <Toggle
            checked={settings.shouldStripBrackets}
            onChange={(v) => {
              void update({ shouldStripBrackets: v })
            }}
            ariaLabel="Strip brackets"
          />
        </Row>
        <Row title="Character cap" description="Maximum characters spoken (0 = unlimited).">
          <input
            type="number"
            min={0}
            value={settings.maxChars}
            onChange={(e) => {
              void update({ maxChars: Number(e.target.value) || 0 })
            }}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-right"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Window">
        <Row title="Start hidden" description="Keep the window hidden until opened from the tray.">
          <Toggle
            checked={settings.shouldStartHidden}
            onChange={(v) => {
              void update({ shouldStartHidden: v })
            }}
            ariaLabel="Start hidden"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup
        title="Backup & restore"
        description="Save shortcuts, settings and your voice list to a JSON file, or restore from one."
      >
        <Row
          title="Configuration file"
          description="Restoring first re-downloads any missing voices, then applies the settings."
          isStacked
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={() => {
                void exportConfig()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
            >
              <Save size={14} />
              {getExportButtonLabel({ isBusy: isExporting })}
            </button>
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={() => {
                void importConfig()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 disabled:opacity-60"
            >
              <Upload size={14} />
              {getImportButtonLabel({ isBusy: isImporting })}
            </button>
          </div>
        </Row>
        {isImporting && downloadingRows.length > 0 && (
          <Row isStacked>
            <div className="flex flex-col gap-2">
              {downloadingRows.map((d) => {
                return <DownloadRow key={d.name} name={d.name} download={d.download} />
              })}
            </div>
          </Row>
        )}
        {logs.length > 0 && (
          <Row isStacked>
            <pre className="selectable text-[11px] leading-relaxed text-text/65 bg-mid-gray/10 rounded-lg p-2 max-h-40 overflow-auto whitespace-pre-wrap">
              {logs.join('\n')}
            </pre>
          </Row>
        )}
      </SettingsGroup>
    </div>
  )

  function getSpeedDescription(params: { rate: number }): string {
    if (params.rate > 1.001) {
      return `${params.rate.toFixed(2)}× · Faster`
    }
    if (params.rate < 0.999) {
      return `${params.rate.toFixed(2)}× · Slower`
    }

    return `${params.rate.toFixed(2)}× · Normal`
  }

  function getExportButtonLabel(params: { isBusy: boolean }): string {
    if (params.isBusy) {
      return 'Exporting…'
    }

    return 'Export…'
  }

  function getImportButtonLabel(params: { isBusy: boolean }): string {
    if (params.isBusy) {
      return 'Importing…'
    }

    return 'Import…'
  }
}
