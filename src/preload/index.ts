import { contextBridge, ipcRenderer } from 'electron'

import { channelSubscriber } from '#src/preload/_channel-subscriber'
import type { TtsApi } from '#src/shared/types'

const api: TtsApi = {
  checkForUpdate: () => {
    return ipcRenderer.invoke('update:check')
  },
  clearHistory: () => {
    return ipcRenderer.invoke('history:clear')
  },
  deleteVoice: (id) => {
    return ipcRenderer.invoke('models:delete', id)
  },

  downloadUpdate: () => {
    return ipcRenderer.invoke('update:download')
  },
  downloadVoice: (id) => {
    return ipcRenderer.invoke('models:download', id)
  },
  downloadVoiceFromUrl: (url) => {
    return ipcRenderer.invoke('models:downloadFromUrl', url)
  },
  exportConfig: () => {
    return ipcRenderer.invoke('config:export')
  },
  getHistory: () => {
    return ipcRenderer.invoke('history:get')
  },
  getKokoroCatalog: () => {
    return ipcRenderer.invoke('models:kokoroCatalog')
  },
  getSettings: () => {
    return ipcRenderer.invoke('settings:get')
  },
  getTtsStatus: () => {
    return ipcRenderer.invoke('tts:getStatus')
  },
  getUpdateStatus: () => {
    return ipcRenderer.invoke('update:getStatus')
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

  onDownloadChanged: channelSubscriber.createForChannel({ channel: 'update:downloadChanged' }),

  onHistoryChanged: channelSubscriber.createForChannel({ channel: 'history:changed' }),
  onModelsLog: channelSubscriber.createForChannel({ channel: 'models:log' }),

  onModelsProgress: channelSubscriber.createForChannel({ channel: 'models:progress' }),
  onSettingsChanged: channelSubscriber.createForChannel({ channel: 'settings:changed' }),
  onStopPlayback: channelSubscriber.createForChannel({ channel: 'tts:stopPlayback' }),
  onTtsStatus: channelSubscriber.createForChannel({ channel: 'tts:status' }),

  onUpdateChanged: channelSubscriber.createForChannel({ channel: 'update:changed' }),

  openMacSettingsPane: (pane) => {
    return ipcRenderer.invoke('permissions:openMacSettingsPane', pane)
  },
  openModelsFolder: () => {
    return ipcRenderer.invoke('models:openModelsFolder')
  },
  playbackEnded: () => {
    return ipcRenderer.invoke('tts:playbackEnded')
  },
  removeHistoryEntry: (id) => {
    return ipcRenderer.invoke('history:remove', id)
  },
  reregisterShortcuts: () => {
    return ipcRenderer.invoke('shortcuts:reregister')
  },
  restartUpdate: () => {
    return ipcRenderer.invoke('update:restart')
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
