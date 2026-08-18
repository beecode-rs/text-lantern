import { contextBridge, ipcRenderer } from 'electron'

import { channelSubscriber } from '#src/preload/_channel-subscriber'
import type { TtsApi } from '#src/shared/types'

const api: TtsApi = {
  clearHistory: () => {
    return ipcRenderer.invoke('history:clear')
  },
  deleteVoice: (name) => {
    return ipcRenderer.invoke('models:delete', name)
  },

  downloadVoice: (name) => {
    return ipcRenderer.invoke('models:download', name)
  },
  exportConfig: () => {
    return ipcRenderer.invoke('config:export')
  },
  getHistory: () => {
    return ipcRenderer.invoke('history:get')
  },
  getSettings: () => {
    return ipcRenderer.invoke('settings:get')
  },
  importConfig: () => {
    return ipcRenderer.invoke('config:import')
  },
  installEngine: (voiceNames) => {
    return ipcRenderer.invoke('models:installEngine', voiceNames)
  },

  isEngineInstalled: () => {
    return ipcRenderer.invoke('models:engineInstalled')
  },
  listVoices: () => {
    return ipcRenderer.invoke('models:list')
  },
  onAudioChunk: channelSubscriber.createForChannel({ channel: 'tts:audioChunk' }),

  onAudioEnd: channelSubscriber.createForChannel({ channel: 'tts:audioEnd' }),
  onAudioStart: channelSubscriber.createForChannel({ channel: 'tts:audioStart' }),

  onConfigLog: channelSubscriber.createForChannel({ channel: 'config:log' }),
  onConfigProgress: channelSubscriber.createForChannel({ channel: 'config:progress' }),

  onHistoryChanged: channelSubscriber.createForChannel({ channel: 'history:changed' }),
  onModelsLog: channelSubscriber.createForChannel({ channel: 'models:log' }),

  onModelsProgress: channelSubscriber.createForChannel({ channel: 'models:progress' }),
  onSettingsChanged: channelSubscriber.createForChannel({ channel: 'settings:changed' }),
  onStopPlayback: channelSubscriber.createForChannel({ channel: 'tts:stopPlayback' }),
  onTtsStatus: channelSubscriber.createForChannel({ channel: 'tts:status' }),
  playbackEnded: () => {
    return ipcRenderer.invoke('tts:playbackEnded')
  },
  reregisterShortcuts: () => {
    return ipcRenderer.invoke('shortcuts:reregister')
  },
  searchVoices: (query) => {
    return ipcRenderer.invoke('models:search', query)
  },
  showSettings: () => {
    return ipcRenderer.invoke('app:showSettings')
  },
  speak: (lang, text, options) => {
    return ipcRenderer.invoke('tts:speak', lang, text, options)
  },
  stop: () => {
    return ipcRenderer.invoke('tts:stop')
  },
  updateSettings: (patch) => {
    return ipcRenderer.invoke('settings:update', patch)
  },
}

contextBridge.exposeInMainWorld('api', api)
