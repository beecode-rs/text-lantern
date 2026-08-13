import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { TtsApi } from '@src/shared/types'

function on<P>(channel: string) {
  return (cb: (payload: P) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, payload: P): void => {
      cb(payload)
    }
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

function onVoid(channel: string) {
  return (cb: () => void): (() => void) => {
    const listener = (): void => {
      cb()
    }
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

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

  onSettingsChanged: on('settings:changed'),
  onTtsStatus: on('tts:status'),
  onAudioStart: on('tts:audioStart'),
  onAudioChunk: on('tts:audioChunk'),
  onAudioEnd: onVoid('tts:audioEnd'),
  onStopPlayback: onVoid('tts:stopPlayback'),
  onModelsLog: on('models:log'),
  onModelsProgress: on('models:progress'),
  onHistoryChanged: on('history:changed')
}

contextBridge.exposeInMainWorld('api', api)
