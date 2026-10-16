import { LifeCycle } from '@beecode/msh-app-boot'

import { updateServiceSingleton } from '#src/main/business/service/update-service'
import { logger } from '#src/main/util/logger'

export class UpdateCheckLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'Update check' })
  }

  protected _createFn(): Promise<void> {
    void updateServiceSingleton()
      .checkNow()
      .catch((error: unknown) => {
        logger().warn('Startup update check failed:', error)
      })

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    return Promise.resolve()
  }
}
