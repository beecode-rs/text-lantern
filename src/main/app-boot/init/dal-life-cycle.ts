import { LifeCycle } from '@beecode/msh-app-boot'

import { historyDalSingleton } from '#src/main/dal/history-dal'
import { settingsDalSingleton } from '#src/main/dal/settings-dal'

export class DalLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'DAL' })
  }

  protected _createFn(): Promise<void> {
    settingsDalSingleton().init()
    historyDalSingleton().init()

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    return Promise.resolve()
  }
}
