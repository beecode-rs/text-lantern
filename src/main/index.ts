import { AppStarter, setAppBootLogger } from '@beecode/msh-app-boot'
import { ElectronApp } from '@src/main/app-boot/electron-app'
import { MainWindowLifeCycle } from '@src/main/app-boot/init/main-window-life-cycle'
import { APP_NAME } from '@src/main/util/constants'
import { logger } from '@src/main/util/logger'
import { app } from 'electron'

app.setName(APP_NAME)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
setAppBootLogger(logger())

const gotLock = app.requestSingleInstanceLock()

if (gotLock) {
  const mainWindowLifeCycle = new MainWindowLifeCycle()
  const appStarter = new AppStarter(new ElectronApp({ mainWindow: mainWindowLifeCycle }))

  app.on('second-instance', () => {
    mainWindowLifeCycle.show()
  })

  void app.whenReady().then(() => {
    void appStarter.start().catch((err: unknown) => {
      logger().error('app boot failed:', err)
    })
  })

  app.on('window-all-closed', () => {
    if (!app.isPackaged) {
      app.quit()
    }
  })

  app.on('before-quit', (e) => {
    if (mainWindowLifeCycle.isDestroying()) {
      return
    }
    e.preventDefault()
    mainWindowLifeCycle.beginDestroy()
    void appStarter.stop().then(() => {
      app.quit()
    })
  })
} else {
  app.quit()
}
