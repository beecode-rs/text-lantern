import { LifeCycle } from '@beecode/msh-app-boot'

import { shortcutsSingleton } from '@src/main/lib/shortcuts'

export class ShortcutsLifeCycle extends LifeCycle {
  public constructor() {
    super({ name: 'Shortcuts' })
  }

  protected async _createFn(): Promise<void> {
    shortcutsSingleton().registerAll()
  }

  protected async _destroyFn(): Promise<void> {
    shortcutsSingleton().unregisterAll()
  }
}
