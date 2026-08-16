import { contextBridge, ipcRenderer } from 'electron'
import type { TtsApi } from '@src/shared/types'

import { channelSubscriber } from '@src/preload/_channel-subscriber'

const api: TtsApi = {
  getSettings: () => {
    return ipcRenderer.invoke('settings:get')
  },
  updateSettings: (patch) => {
    return ipcRenderer.invoke('settings:update', patch)
  },

  listVoices: () => {
    return ipcRenderer.invoke('models:list')
  },
  engineInstalled: () => {
    return ipcRenderer.invoke('models:engineInstalled')
  },
  installEngine: () => {
    return ipcRenderer.invoke('models:installEngine')
  },
  downloadVoice: (name) => {
    return ipcRenderer.invoke('models:download', name)
  },
  deleteVoice: (name) => {
    return ipcRenderer.invoke('models:delete', name)
  },
  searchVoices: (query) => {
    return ipcRenderer.invoke('models:search', query)
  },

  speak: (lang, text) => {
    return ipcRenderer.invoke('tts:speak', lang, text)
  },
  stop: () => {
    return ipcRenderer.invoke('tts:stop')
  },
  playbackEnded: () => {
    return ipcRenderer.invoke('tts:playbackEnded')
  },

  reregisterShortcuts: () => {
    return ipcRenderer.invoke('shortcuts:reregister')
  },
  showSettings: () => {
    return ipcRenderer.invoke('app:showSettings')
  },

  getHistory: () => {
    return ipcRenderer.invoke('history:get')
  },
  clearHistory: () => {
    return ipcRenderer.invoke('history:clear')
  },

  onSettingsChanged: channelSubscriber.createForChannel({ channel: 'settings:changed' }),
  onTtsStatus: channelSubscriber.createForChannel({ channel: 'tts:status' }),
  onAudioStart: channelSubscriber.createForChannel({ channel: 'tts:audioStart' }),
  onAudioChunk: channelSubscriber.createForChannel({ channel: 'tts:audioChunk' }),
  onAudioEnd: channelSubscriber.createForChannel<void>({ channel: 'tts:audioEnd' }),
  onStopPlayback: channelSubscriber.createForChannel<void>({ channel: 'tts:stopPlayback' }),
  onModelsLog: channelSubscriber.createForChannel({ channel: 'models:log' }),
  onModelsProgress: channelSubscriber.createForChannel({ channel: 'models:progress' }),
  onHistoryChanged: channelSubscriber.createForChannel({ channel: 'history:changed' })
}

contextBridge.exposeInMainWorld('api', api)
