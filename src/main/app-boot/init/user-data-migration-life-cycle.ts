import { LifeCycle } from '@beecode/msh-app-boot'
import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { logger } from '#src/main/util/logger'

export class UserDataMigrationLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'User data migration' })
  }

  protected _createFn(): Promise<void> {
    const legacyName = 'tts-reader'
    const appData = app.getPath('appData')
    const newPath = app.getPath('userData')
    const oldPath = path.join(appData, legacyName)
    if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) {
      return Promise.resolve()
    }
    try {
      fs.cpSync(oldPath, newPath, { recursive: true })
    } catch (err) {
      logger().error('could not migrate legacy user data:', err)
    }

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    return Promise.resolve()
  }
}
