import { LifeCycle } from '@beecode/msh-app-boot'
import { app, nativeImage } from 'electron'

import { permissionServiceSingleton } from '#src/main/business/service/permission-service'
import { logger } from '#src/main/util/logger'
import { pathUtil } from '#src/main/util/path-util'

export class PlatformLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'Platform' })
  }

  protected _createFn(): Promise<void> {
    void permissionServiceSingleton()
      .requestMacPermissionsOnLaunch()
      .catch((error: unknown) => {
        logger().warn('Requesting macOS permissions on launch failed:', error)
      })
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
