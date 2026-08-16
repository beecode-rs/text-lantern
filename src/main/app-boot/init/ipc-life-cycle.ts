import { LifeCycle } from '@beecode/msh-app-boot'
import type { BrowserWindow } from 'electron'

import { ipcController } from '@src/main/controller/ipc-controller'

export class IpcLifeCycle extends LifeCycle {
  private readonly _windowGetter: () => BrowserWindow | null

  public constructor(params: { windowGetter: () => BrowserWindow | null }) {
    super({ name: 'IPC controller' })
    this._windowGetter = params.windowGetter
  }

  protected async _createFn(): Promise<void> {
    ipcController.register({ getWindow: this._windowGetter })
  }

  protected async _destroyFn(): Promise<void> {
    ipcController.unregister()
  }
}
