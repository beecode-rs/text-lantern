import { LifeCycle } from '@beecode/msh-app-boot'
import type { BrowserWindow } from 'electron'

import { ipcController } from '#src/main/controller/ipc-controller'

export class IpcLifeCycle extends LifeCycle {
  protected readonly _windowGetter: () => BrowserWindow | null

  constructor(params: { windowGetter: () => BrowserWindow | null }) {
    super({ name: 'IPC controller' })
    this._windowGetter = params.windowGetter
  }

  protected _createFn(): Promise<void> {
    ipcController.register({ getWindow: this._windowGetter })

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    ipcController.unregister()

    return Promise.resolve()
  }
}
