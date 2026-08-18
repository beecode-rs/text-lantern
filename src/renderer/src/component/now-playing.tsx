import { AlertTriangle, Loader2, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { StreamPlayer } from '#src/renderer/src/lib/stream-player'
import type { TtsStatus } from '#src/shared/types'

export function NowPlaying(): React.JSX.Element {
  const [status, setStatus] = useState<TtsStatus>({ state: 'idle' })
  const playerRef = useRef<StreamPlayer | null>(null)
  playerRef.current ??= new StreamPlayer()

  useEffect(() => {
    const offStatus = api.onTtsStatus(setStatus)

    const offStart = api.onAudioStart(({ sampleRate }) => {
      const player = playerRef.current
      if (!player) {
        return
      }
      player.onDone = () => {
        void api.playbackEnded()
      }
      player.start({ sampleRate })
    })

    const offChunk = api.onAudioChunk((samples) => {
      playerRef.current?.feed(samples)
    })

    const offEnd = api.onAudioEnd(() => {
      playerRef.current?.end()
    })

    const offStop = api.onStopPlayback(() => {
      playerRef.current?.stop()
    })

    return () => {
      offStatus()
      offStart()
      offChunk()
      offEnd()
      offStop()
    }
  }, [])

  const busy = status.state === 'synthesizing' || status.state === 'reading'

  return (
    <>
      {(busy || status.state === 'error') && (
        <div className="shrink-0 border-t border-accent/40 bg-background-ui/95 backdrop-blur px-4 py-2.5 flex items-center gap-3 text-white">
          {status.state === 'synthesizing' && <Loader2 size={15} className="animate-spin" />}
          {status.state === 'reading' && <Square size={13} className="fill-current" />}
          {status.state === 'error' && <AlertTriangle size={15} />}

          <div className="flex-1 min-w-0 text-sm">
            {status.state === 'synthesizing' && <span>Synthesizing…</span>}
            {status.state === 'reading' && (
              <span className="truncate">
                Reading <span className="opacity-70 selectable">· {status.voice}</span>
              </span>
            )}
            {status.state === 'error' && <span className="truncate selectable">{status.error}</span>}
          </div>

          {busy && (
            <button
              type="button"
              onClick={() => {
                void api.stop()
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Square size={11} className="fill-current" /> Stop
            </button>
          )}
        </div>
      )}
    </>
  )
}
