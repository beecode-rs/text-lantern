import { type HistoryEntry, type Settings, type TtsStatus } from '@src/shared/types'
import { type IpcRendererEvent, ipcRenderer } from 'electron'

export type ChannelPayloads = {
  'config:log': string
  'config:progress': { name: string; progress: number }
  'history:changed': HistoryEntry[]
  'models:log': string
  'models:progress': { name: string; progress: number }
  'settings:changed': Settings
  'tts:audioChunk': Buffer
  'tts:audioEnd': undefined
  'tts:audioStart': { sampleRate: number; voice: string }
  'tts:status': TtsStatus
  'tts:stopPlayback': undefined
}

export const channelSubscriber = {
  createForChannel<Channel extends keyof ChannelPayloads>(params: { channel: Channel }) {
    return (cb: (payload: ChannelPayloads[Channel]) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, payload: ChannelPayloads[Channel]): void => {
        cb(payload)
      }
      ipcRenderer.on(params.channel, listener)

      return () => {
        ipcRenderer.removeListener(params.channel, listener)
      }
    }
  },
}
