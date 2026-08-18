import { AppFlow } from '@beecode/msh-app-boot'
import type { BrowserWindow } from 'electron'

import { DalLifeCycle } from '#src/main/app-boot/init/dal-life-cycle'
import { IpcLifeCycle } from '#src/main/app-boot/init/ipc-life-cycle'
import { type MainWindowLifeCycle } from '#src/main/app-boot/init/main-window-life-cycle'
import { PlatformLifeCycle } from '#src/main/app-boot/init/platform-life-cycle'
import { ShortcutsLifeCycle } from '#src/main/app-boot/init/shortcuts-life-cycle'
import { TrayLifeCycle } from '#src/main/app-boot/init/tray-life-cycle'
import { TtsLifeCycle } from '#src/main/app-boot/init/tts-life-cycle'
import { UserDataMigrationLifeCycle } from '#src/main/app-boot/init/user-data-migration-life-cycle'

export class ElectronApp extends AppFlow {
  constructor(params: { mainWindow: MainWindowLifeCycle }) {
    const { mainWindow } = params
    const windowGetter = (): BrowserWindow | null => {
      return mainWindow.getWindow()
    }
    super(
      new UserDataMigrationLifeCycle(),
      new DalLifeCycle(),
      new PlatformLifeCycle(),
      mainWindow,
      [new TrayLifeCycle({ windowGetter }), new ShortcutsLifeCycle(), new IpcLifeCycle({ windowGetter })],
      new TtsLifeCycle(),
    )
  }
}
