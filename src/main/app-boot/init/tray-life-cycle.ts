import { LifeCycle } from '@beecode/msh-app-boot'
import { traySingleton } from '@src/main/lib/tray'
import type { BrowserWindow } from 'electron'

export class TrayLifeCycle extends LifeCycle {
  protected readonly _windowGetter: () => BrowserWindow | null

  constructor(params: { windowGetter: () => BrowserWindow | null }) {
    super({ name: 'Tray' })
    this._windowGetter = params.windowGetter
  }

  protected _createFn(): Promise<void> {
    const win = this._windowGetter()
    if (!win) {
      throw new Error('main window is not available for tray creation')
    }
    traySingleton().create({ window: win })

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    traySingleton().destroy()

    return Promise.resolve()
  }
}
