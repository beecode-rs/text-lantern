import fs from 'node:fs'
import path from 'node:path'

import { LifeCycle } from '@beecode/msh-app-boot'
import { app } from 'electron'

import { logger } from '@src/main/util/logger'

export class UserDataMigrationLifeCycle extends LifeCycle {
  public constructor() {
    super({ name: 'User data migration' })
  }

  protected async _createFn(): Promise<void> {
    const legacyName = 'tts-reader'
    const appData = app.getPath('appData')
    const newPath = app.getPath('userData')
    const oldPath = path.join(appData, legacyName)
    if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) {
      return
    }
    try {
      fs.cpSync(oldPath, newPath, { recursive: true })
    } catch (err) {
      logger().error('could not migrate legacy user data:', err)
    }
  }

  protected async _destroyFn(): Promise<void> {}
}
