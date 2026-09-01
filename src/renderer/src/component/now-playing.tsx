import { AlertTriangle, Loader2, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { StreamPlayer } from '#src/renderer/src/lib/stream-player'
import { WaitingBeeper } from '#src/renderer/src/lib/waiting-beeper'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import { TtsState, type TtsStatus } from '#src/shared/types'
import { voiceLabelUtil } from '#src/shared/voice/voice-label'

export function NowPlaying(): React.JSX.Element {
  const [status, setStatus] = useState<TtsStatus>({ state: TtsState.IDLE })
  const shouldBleepWhileLoadingModel = useSettingsStore((s) => s.settings?.shouldBleepWhileLoadingModel ?? true)
  const playerRef = useRef<StreamPlayer | null>(null)
  playerRef.current ??= new StreamPlayer()
  const beeperRef = useRef<WaitingBeeper | null>(null)
  beeperRef.current ??= new WaitingBeeper()

  useEffect(() => {
    let isPushReceived = false
    const offStatus = api.onTtsStatus((status) => {
      isPushReceived = true
      setStatus(status)
    })
    void api.getTtsStatus().then((status) => {
      if (!isPushReceived) {
        setStatus(status)
      }
    })

    const offStart = api.onAudioStart(({ sampleRate }) => {
      const player = playerRef.current
      if (!player) {
        return
      }
      player.onDone = () => {
        void api.playbackEnded()
      }
      const startDelayMs = useSettingsStore.getState().settings?.playbackStartDelayMs ?? 500
      player.start({ sampleRate, startDelayMs })
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
      beeperRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    const isAwaitingVoice = status.state === TtsState.LISTENING || status.state === TtsState.SYNTHESIZING
    if (isAwaitingVoice && shouldBleepWhileLoadingModel) {
      beeperRef.current?.start()
    } else {
      beeperRef.current?.stop()
    }
  }, [status.state, shouldBleepWhileLoadingModel])

  // Stop stays hidden during the sub-second LISTENING window to avoid button flicker; the stop shortcut and tray Stop still work.
  const busy = status.state === TtsState.SYNTHESIZING || status.state === TtsState.READING

  return (
    <>
      {status.state !== TtsState.IDLE && (
        <div className="shrink-0 border-t border-accent/40 bg-background-ui/95 backdrop-blur px-4 py-2.5 flex items-center gap-3 text-white">
          {status.state === TtsState.LISTENING && <Loader2 size={15} className="animate-spin" />}
          {status.state === TtsState.SYNTHESIZING && <Loader2 size={15} className="animate-spin" />}
          {status.state === TtsState.READING && <Square size={13} className="fill-current" />}
          {status.state === TtsState.ERROR && <AlertTriangle size={15} />}

          <div className="flex-1 min-w-0 text-sm">
            {status.state === TtsState.LISTENING && <span>Listening…</span>}
            {status.state === TtsState.SYNTHESIZING && <span>Synthesizing…</span>}
            {status.state === TtsState.READING && (
              <span className="truncate">
                Reading{' '}
                <span className="opacity-70 selectable">· {voiceLabelUtil.displayName({ id: status.voice })}</span>
              </span>
            )}
            {status.state === TtsState.ERROR && <span className="truncate selectable">{status.error}</span>}
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
