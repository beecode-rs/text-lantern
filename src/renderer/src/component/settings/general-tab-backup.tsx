import { Save, Upload } from 'lucide-react'

import { DownloadRow } from '#src/renderer/src/component/ui/download-row'
import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { useConfigBackupStore } from '#src/renderer/src/store/config-backup'
import type { VoiceDownload } from '#src/shared/types'

export function GeneralTabBackup(): React.JSX.Element {
  const isExporting = useConfigBackupStore((s) => s.isExporting)
  const isImporting = useConfigBackupStore((s) => s.isImporting)
  const logs = useConfigBackupStore((s) => s.logs)
  const progress = useConfigBackupStore((s) => s.progress)
  const exportConfig = useConfigBackupStore((s) => s.exportConfig)
  const importConfig = useConfigBackupStore((s) => s.importConfig)

  const downloadingRows: { name: string; download: VoiceDownload }[] = Object.keys(progress).map((name) => {
    return { download: { progress: progress[name], state: 'downloading' }, name }
  })

  return (
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
  )

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
