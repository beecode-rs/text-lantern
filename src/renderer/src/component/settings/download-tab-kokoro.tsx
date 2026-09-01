import { RemoteModelRow } from '#src/renderer/src/component/ui/remote-model-row'
import { useModelsStore } from '#src/renderer/src/store/models'
import { type RemoteVoice, TtsProvider } from '#src/shared/types'
import { KOKORO_VOICE_CATALOG, type KokoroVoice } from '#src/shared/voice/kokoro-voice-catalog'
import { voiceIdParser } from '#src/shared/voice/voice-id'

export function DownloadTabKokoro({
  installedIds,
  downloadingIds,
}: {
  installedIds: Set<string>
  downloadingIds: string[]
}): React.JSX.Element {
  const { download } = useModelsStore()

  return (
    <section className="flex flex-col gap-2">
      {KOKORO_VOICE_CATALOG.map((voice) => {
        const id = voiceIdParser.build({ name: voice.id, provider: TtsProvider.KOKORO })

        return (
          <RemoteModelRow
            key={id}
            voice={toRemoteVoice({ voice })}
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

  function toRemoteVoice(params: { voice: KokoroVoice }): RemoteVoice {
    return {
      lang: params.voice.lang,
      name: params.voice.id,
      provider: TtsProvider.KOKORO,
      quality: `${params.voice.accent} ${params.voice.gender}`,
      sizeBytes: 0,
    }
  }
}
