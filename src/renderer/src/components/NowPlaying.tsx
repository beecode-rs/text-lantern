import { useEffect, useRef, useState } from 'react'
import { Square, Loader2, AlertTriangle } from 'lucide-react'
import type { TtsStatus } from '../../../shared/types'
import { api } from '../api'

export function NowPlaying(): React.JSX.Element {
  const [status, setStatus] = useState<TtsStatus>({ state: 'idle' })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    const offStatus = api.onTtsStatus(setStatus)

    const offPlay = api.onPlayWav(async (path) => {
      try {
        const buf = await api.loadWav(path)
        const blob = new Blob([buf], { type: 'audio/wav' })
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        const a = audioRef.current
        if (a) {
          a.src = url
          await a.play().catch(() => {})
        }
      } catch (err) {
        console.error('Failed to play WAV:', err)
      }
    })

    const offStop = api.onStopPlayback(() => {
      const a = audioRef.current
      if (a) {
        a.pause()
      }
    })

    return () => {
      offStatus()
      offPlay()
      offStop()
    }
  }, [])

  const busy = status.state === 'synthesizing' || status.state === 'reading'

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => api.playbackEnded()}
        className="hidden"
      />

      {(busy || status.state === 'error') && (
        <div className="shrink-0 border-t border-mid-gray/20 bg-background-ui/95 backdrop-blur px-4 py-2.5 flex items-center gap-3 text-white">
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
            {status.state === 'error' && (
              <span className="truncate selectable">{status.error}</span>
            )}
          </div>

          {busy && (
            <button
              type="button"
              onClick={() => api.stop()}
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
