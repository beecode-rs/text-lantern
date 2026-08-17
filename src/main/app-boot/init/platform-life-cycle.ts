import { LifeCycle } from '@beecode/msh-app-boot'
import { pathUtil } from '@src/main/util/path-util'
import { app, nativeImage, systemPreferences } from 'electron'
import path from 'node:path'

export class PlatformLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'Platform' })
  }

  protected _createFn(): Promise<void> {
    if (process.platform === 'darwin') {
      void systemPreferences.isTrustedAccessibilityClient(true)
    }
    this._applyDockIcon()

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    return Promise.resolve()
  }

  protected _applyDockIcon(): void {
    const icon = nativeImage.createFromPath(path.join(pathUtil.projectRoot(), 'resource', 'icon.png'))
    if (icon.isEmpty()) {
      return
    }
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(icon)
    }
  }
}
