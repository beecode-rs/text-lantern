import { LifeCycle } from '@beecode/msh-app-boot'
import { shortcutsSingleton } from '@src/main/lib/shortcuts'

export class ShortcutsLifeCycle extends LifeCycle {
  constructor() {
    super({ name: 'Shortcuts' })
  }

  protected _createFn(): Promise<void> {
    shortcutsSingleton().registerAll()

    return Promise.resolve()
  }

  protected _destroyFn(): Promise<void> {
    shortcutsSingleton().unregisterAll()

    return Promise.resolve()
  }
}
