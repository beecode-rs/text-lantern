import { LifeCycle } from '@beecode/msh-app-boot'
import type { BrowserWindow } from 'electron'

import { traySingleton } from '@src/main/lib/tray'

export class TrayLifeCycle extends LifeCycle {
  private readonly _windowGetter: () => BrowserWindow | null

  public constructor(params: { windowGetter: () => BrowserWindow | null }) {
    super({ name: 'Tray' })
    this._windowGetter = params.windowGetter
  }

  protected async _createFn(): Promise<void> {
    const win = this._windowGetter()
    if (!win) {
      throw new Error('main window is not available for tray creation')
    }
    traySingleton().create({ window: win })
  }

  protected async _destroyFn(): Promise<void> {
    traySingleton().destroy()
  }
}
