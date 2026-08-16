import { ipcRenderer, type IpcRendererEvent } from 'electron'

export const channelSubscriber = {
  createForChannel<P>(params: { channel: string }) {
    return (cb: (payload: P) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, payload: P): void => {
        cb(payload)
      }
      ipcRenderer.on(params.channel, listener)
      return () => {
        ipcRenderer.removeListener(params.channel, listener)
      }
    }
  }
}
