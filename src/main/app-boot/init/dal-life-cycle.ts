import { LifeCycle } from '@beecode/msh-app-boot'

import { historyDalSingleton } from '@src/main/dal/history-dal'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'

export class DalLifeCycle extends LifeCycle {
  public constructor() {
    super({ name: 'DAL' })
  }

  protected async _createFn(): Promise<void> {
    settingsDalSingleton().init()
    historyDalSingleton().init()
  }

  protected async _destroyFn(): Promise<void> {}
}
