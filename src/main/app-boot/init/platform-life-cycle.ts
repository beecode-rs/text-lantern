import { LifeCycle } from '@beecode/msh-app-boot'
import { app, nativeImage, systemPreferences } from 'electron'

import { Selection } from '#src/main/lib/selection'
import { pathUtil } from '#src/main/util/path-util'

export class PlatformLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'Platform' })
  }

  protected _createFn(): Promise<void> {
    if (process.platform === 'darwin') {
      void systemPreferences.isTrustedAccessibilityClient(true)
      void new Selection().warmUp().catch(() => {
        return undefined
      })
    }
    this._applyDockIcon()

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    return Promise.resolve()
  }

  protected _applyDockIcon(): void {
    const icon = nativeImage.createFromPath(pathUtil.appIcon())
    if (icon.isEmpty()) {
      return
    }
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(icon)
    }
  }
}
