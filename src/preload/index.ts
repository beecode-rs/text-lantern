import { contextBridge, ipcRenderer } from 'electron'

import { channelSubscriber } from '#src/preload/_channel-subscriber'
import type { TtsApi } from '#src/shared/types'

const api: TtsApi = {
  clearHistory: () => {
    return ipcRenderer.invoke('history:clear')
  },
  createCosyvoiceVoice: (params) => {
    return ipcRenderer.invoke('models:cosyvoiceCreateVoice', params)
  },
  deleteCosyvoiceModel: (fileName) => {
    return ipcRenderer.invoke('models:cosyvoiceDeleteModel', fileName)
  },
  deleteVoice: (id) => {
    return ipcRenderer.invoke('models:delete', id)
  },

  downloadCosyvoiceFrontend: () => {
    return ipcRenderer.invoke('models:cosyvoiceDownloadFrontend')
  },
  downloadCosyvoiceModel: (fileName) => {
    return ipcRenderer.invoke('models:cosyvoiceDownloadModel', fileName)
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
  getCosyvoiceModelVariants: () => {
    return ipcRenderer.invoke('models:cosyvoiceModelVariants')
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
  importConfig: () => {
    return ipcRenderer.invoke('config:import')
  },
  installCosyvoiceEngine: () => {
    return ipcRenderer.invoke('models:cosyvoiceInstallEngine')
  },
  installEngine: (voiceNames) => {
    return ipcRenderer.invoke('models:installEngine', voiceNames)
  },

  isCosyvoiceEngineInstalled: () => {
    return ipcRenderer.invoke('models:cosyvoiceEngineInstalled')
  },
  isCosyvoiceFrontendInstalled: () => {
    return ipcRenderer.invoke('models:cosyvoiceFrontendInstalled')
  },
  isCosyvoiceSupported: () => {
    return ipcRenderer.invoke('models:cosyvoiceSupported')
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
  uninstallCosyvoiceEngine: () => {
    return ipcRenderer.invoke('models:cosyvoiceUninstallEngine')
  },
  updateSettings: (patch) => {
    return ipcRenderer.invoke('settings:update', patch)
  },
}

contextBridge.exposeInMainWorld('api', api)
