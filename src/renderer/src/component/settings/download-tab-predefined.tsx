import { DefaultVoiceRow } from '#src/renderer/src/component/ui/default-voice-row'
import { useModelsStore } from '#src/renderer/src/store/models'
import { TtsProvider } from '#src/shared/types'
import { DEFAULT_VOICE_OPTIONS } from '#src/shared/voice/default-voice'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export function DownloadTabPredefined({
  installedIds,
  downloadingIds,
}: {
  installedIds: Set<string>
  downloadingIds: string[]
}): React.JSX.Element {
  const { download } = useModelsStore()

  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm text-text/55">Curated Piper voices for common languages — one tap each.</p>
      {DEFAULT_VOICE_OPTIONS.map((option) => {
        const id = voiceIdParser.build({ name: option.voiceName, provider: TtsProvider.PIPER })

        return (
          <DefaultVoiceRow
            key={id}
            option={option}
            isInstalled={installedIds.has(id)}
            isDownloading={downloadingIds.includes(id)}
            onDownload={() => {
              void download(id)
            }}
          />
        )
      })}
    </section>
  )
}
