import { contextBridge, ipcRenderer } from 'electron'
import type { TtsApi } from '@src/shared/types'

import { channelSubscriberService } from '@src/preload/_channel-subscriber-service'

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

  onSettingsChanged: channelSubscriberService.createForChannel({ channel: 'settings:changed' }),
  onTtsStatus: channelSubscriberService.createForChannel({ channel: 'tts:status' }),
  onAudioStart: channelSubscriberService.createForChannel({ channel: 'tts:audioStart' }),
  onAudioChunk: channelSubscriberService.createForChannel({ channel: 'tts:audioChunk' }),
  onAudioEnd: channelSubscriberService.createForChannel<void>({ channel: 'tts:audioEnd' }),
  onStopPlayback: channelSubscriberService.createForChannel<void>({ channel: 'tts:stopPlayback' }),
  onModelsLog: channelSubscriberService.createForChannel({ channel: 'models:log' }),
  onModelsProgress: channelSubscriberService.createForChannel({ channel: 'models:progress' }),
  onHistoryChanged: channelSubscriberService.createForChannel({ channel: 'history:changed' })
}

contextBridge.exposeInMainWorld('api', api)
