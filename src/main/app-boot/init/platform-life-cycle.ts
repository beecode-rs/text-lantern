import path from 'node:path'

import { LifeCycle } from '@beecode/msh-app-boot'
import { app, nativeImage, systemPreferences } from 'electron'

import { pathUtil } from '@src/main/util/path-util'

export class PlatformLifeCycle extends LifeCycle {
  public constructor() {
    super({ name: 'Platform' })
  }

  protected async _createFn(): Promise<void> {
    if (process.platform === 'darwin') {
      void systemPreferences.isTrustedAccessibilityClient(true)
    }
    this._applyDockIcon()
  }

  protected async _destroyFn(): Promise<void> {}

  protected _applyDockIcon(): void {
    const icon = nativeImage.createFromPath(
      path.join(pathUtil.projectRoot(), 'resource', 'icon.png')
    )
    if (icon.isEmpty()) {
      return
    }
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(icon)
    }
  }
}
