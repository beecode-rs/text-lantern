import { DefaultVoiceRow } from '#src/renderer/src/component/ui/default-voice-row'
import { useModelsStore } from '#src/renderer/src/store/models'
import { DEFAULT_VOICE_OPTIONS } from '#src/shared/voice/default-voice'

export function DownloadTabPredefined({
  installedNames,
  downloadingNames,
}: {
  installedNames: Set<string>
  downloadingNames: string[]
}): React.JSX.Element {
  const { download } = useModelsStore()

  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm text-text/55">Curated Piper voices for common languages — one tap each.</p>
      {DEFAULT_VOICE_OPTIONS.map((option) => {
        return (
          <DefaultVoiceRow
            key={option.voiceName}
            option={option}
            isInstalled={installedNames.has(option.voiceName)}
            isDownloading={downloadingNames.includes(option.voiceName)}
            onDownload={() => {
              void download(option.voiceName)
            }}
          />
        )
      })}
    </section>
  )
}
